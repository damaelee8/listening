'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle, BarChart3, BookMarked, Check, ChevronLeft, ChevronRight,
  CircleCheckBig, FileAudio, Headphones, LoaderCircle, Pause, Play,
  Repeat2, RotateCcw, Sparkles, Tags, Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { loadAudio as loadStoredAudio, saveAudio } from '@/lib/audio-storage';

type Sentence = {
  id: number; start: number; end: number; text: string; answer?: string;
  done?: boolean; mastered?: boolean; tags?: string[]; replayCount?: number;
  practicedAt?: string;
};
type View = 'practice' | 'review' | 'stats';
type DiffToken = { text: string; kind: 'correct' | 'missing' | 'extra' };

const demoSentences: Sentence[] = [
  { id: 1, start: 0, end: 5.2, text: 'Today, we are going to look at a rather unusual adaptation found in desert plants.', done: true, answer: 'Today we are going to look at a rather unusual adaption found in desert plants.', tags: ['拼写'], replayCount: 2 },
  { id: 2, start: 5.2, end: 10.8, text: 'Now, you might assume that the greatest challenge these plants face is simply the lack of water.' },
  { id: 3, start: 10.8, end: 15.6, text: 'But temperature fluctuation can be equally damaging to their tissues.' },
  { id: 4, start: 15.6, end: 21.4, text: 'During the day, the surface of the plant may become extremely hot.' },
  { id: 5, start: 21.4, end: 27.8, text: 'At night, however, that temperature can fall surprisingly quickly.' },
];
const errorTags = ['生词', '连读 / 弱读', '发音辨识', '拼写', '语法结构', '注意力'];
const waveHeights = [18, 28, 39, 24, 46, 31, 20, 42, 51, 34, 23, 43, 56, 30, 18, 38, 49, 27, 35, 19, 45, 31, 24, 40, 52, 29, 20, 36, 47, 25, 33, 18, 42, 30, 22, 38, 48, 27, 19, 34, 44, 24, 31, 17, 40, 28, 21, 35];

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
}
function normalizeWord(word: string) { return word.toLowerCase().replace(/[^a-z0-9']/g, ''); }

function diffWords(answer: string, original: string): DiffToken[] {
  const typed = answer.trim().split(/\s+/).filter(Boolean);
  const expected = original.trim().split(/\s+/).filter(Boolean);
  const table = Array.from({ length: expected.length + 1 }, () => Array<number>(typed.length + 1).fill(0));
  for (let i = 1; i <= expected.length; i += 1) {
    for (let j = 1; j <= typed.length; j += 1) {
      table[i][j] = normalizeWord(expected[i - 1]) === normalizeWord(typed[j - 1])
        ? table[i - 1][j - 1] + 1 : Math.max(table[i - 1][j], table[i][j - 1]);
    }
  }
  const result: DiffToken[] = [];
  let i = expected.length; let j = typed.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && normalizeWord(expected[i - 1]) === normalizeWord(typed[j - 1])) {
      result.unshift({ text: expected[i - 1], kind: 'correct' }); i -= 1; j -= 1;
    } else if (j > 0 && (i === 0 || table[i][j - 1] >= table[i - 1][j])) {
      result.unshift({ text: typed[j - 1], kind: 'extra' }); j -= 1;
    } else { result.unshift({ text: expected[i - 1], kind: 'missing' }); i -= 1; }
  }
  return result;
}
function accuracy(answer: string, original: string) {
  const tokens = diffWords(answer, original);
  return tokens.length ? Math.round((tokens.filter((token) => token.kind === 'correct').length / tokens.length) * 100) : 0;
}
function NavButton({ active, icon, children, onClick }: { active: boolean; icon: React.ReactNode; children: React.ReactNode; onClick: () => void }) {
  return <Button variant={active ? 'secondary' : 'ghost'} size="sm" onClick={onClick}>{icon}{children}</Button>;
}

export default function Home() {
  const [view, setView] = useState<View>('practice');
  const [sentences, setSentences] = useState<Sentence[]>(demoSentences);
  const [activeIndex, setActiveIndex] = useState(1);
  const [answer, setAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [loop, setLoop] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [audioUrl, setAudioUrl] = useState<string>();
  const [audioFile, setAudioFile] = useState<File>();
  const [fileName, setFileName] = useState('植物如何适应沙漠环境');
  const [transcribing, setTranscribing] = useState(false);
  const [transcribeError, setTranscribeError] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const active = sentences[Math.min(activeIndex, sentences.length - 1)];
  const completed = sentences.filter((sentence) => sentence.done).length;
  const mistakes = sentences.filter((sentence) => (sentence.tags?.length ?? 0) > 0);
  const progress = sentences.length ? Math.round((completed / sentences.length) * 100) : 0;
  const diff = useMemo(() => diffWords(answer, active?.text ?? ''), [answer, active?.text]);
  const overallAccuracy = useMemo(() => {
    const practiced = sentences.filter((sentence) => sentence.done && sentence.answer);
    return practiced.length ? Math.round(practiced.reduce((sum, sentence) => sum + accuracy(sentence.answer ?? '', sentence.text), 0) / practiced.length) : 0;
  }, [sentences]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('toefl-listening-project');
      if (saved) {
        const project = JSON.parse(saved) as { fileName: string; sentences: Sentence[] };
        if (project.sentences?.length) { setSentences(project.sentences); setFileName(project.fileName); setActiveIndex(0); }
      }
      void loadStoredAudio().then((file) => {
        if (file) { setAudioFile(file); setAudioUrl(URL.createObjectURL(file)); }
      });
    } finally { setHydrated(true); }
  }, []);
  useEffect(() => {
    if (hydrated) localStorage.setItem('toefl-listening-project', JSON.stringify({ fileName, sentences }));
  }, [fileName, sentences, hydrated]);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !active) return;
    audio.playbackRate = speed;
    const onTime = () => {
      if (audio.currentTime >= active.end) {
        if (loop) { audio.currentTime = active.start; void audio.play(); incrementReplay(); }
        else { audio.pause(); setPlaying(false); }
      }
    };
    audio.addEventListener('timeupdate', onTime);
    return () => audio.removeEventListener('timeupdate', onTime);
  }, [active, loop, speed]);
  useEffect(() => {
    type ToolContext = { registerTool: (tool: unknown, options?: { signal?: AbortSignal }) => void | Promise<void> };
    const context = (document as Document & { modelContext?: ToolContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const selectTool = context.registerTool({
        name: 'select_practice_sentence', title: '选择精听句子',
        description: '选择一条句子作为当前精听和听写目标。',
        inputSchema: { type: 'object', properties: { sentenceNumber: { type: 'integer', minimum: 1 } }, required: ['sentenceNumber'], additionalProperties: false },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute(input: unknown) {
          const number = Number((input as { sentenceNumber?: number }).sentenceNumber);
          if (!Number.isInteger(number) || number < 1 || number > sentences.length) throw new Error('句子编号超出范围');
          selectSentence(number - 1); setView('practice'); return { selected: number };
        },
      }, { signal: lifecycle.signal });
    const submitTool = context.registerTool({
      name: 'submit_sentence_dictation', title: '提交句子听写',
      description: '为指定句子提交英文听写，并更新页面上的对照结果和训练统计。',
      inputSchema: {
        type: 'object',
        properties: { sentenceNumber: { type: 'integer', minimum: 1 }, answer: { type: 'string', minLength: 1 } },
        required: ['sentenceNumber', 'answer'], additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute(input: unknown) {
        const data = input as { sentenceNumber?: number; answer?: string };
        const number = Number(data.sentenceNumber);
        const typedAnswer = String(data.answer ?? '').trim();
        if (!Number.isInteger(number) || number < 1 || number > sentences.length) throw new Error('句子编号超出范围');
        if (!typedAnswer) throw new Error('听写内容不能为空');
        const target = sentences[number - 1];
        setSentences((current) => current.map((sentence, index) => index === number - 1 ? { ...sentence, answer: typedAnswer, done: true, practicedAt: new Date().toISOString() } : sentence));
        setActiveIndex(number - 1); setAnswer(typedAnswer); setShowResult(true); setView('practice');
        return { sentenceNumber: number, accuracy: accuracy(typedAnswer, target.text), completed: true };
      },
    }, { signal: lifecycle.signal });
    void Promise.all([Promise.resolve(selectTool), Promise.resolve(submitTool)]).catch(() => undefined);
    return () => lifecycle.abort();
  }, [sentences]);

  function incrementReplay() {
    setSentences((current) => current.map((sentence, index) => index === activeIndex ? { ...sentence, replayCount: (sentence.replayCount ?? 0) + 1 } : sentence));
  }
  function togglePlay() {
    const audio = audioRef.current;
    if (!audioUrl || !audio || !active) return;
    if (playing) { audio.pause(); return; }
    if (audio.currentTime < active.start || audio.currentTime >= active.end) audio.currentTime = active.start;
    audio.playbackRate = speed; void audio.play();
  }
  function selectSentence(index: number) {
    audioRef.current?.pause(); setPlaying(false); setActiveIndex(index);
    setAnswer(sentences[index].answer ?? ''); setShowResult(Boolean(sentences[index].done));
    if (audioRef.current) audioRef.current.currentTime = sentences[index].start;
  }
  function submitAnswer() {
    if (!answer.trim()) return;
    setSentences((current) => current.map((sentence, index) => index === activeIndex ? { ...sentence, answer, done: true, practicedAt: new Date().toISOString() } : sentence));
    setShowResult(true);
  }
  function toggleTag(tag: string) {
    setSentences((current) => current.map((sentence, index) => {
      if (index !== activeIndex) return sentence;
      const tags = sentence.tags ?? [];
      return { ...sentence, tags: tags.includes(tag) ? tags.filter((item) => item !== tag) : [...tags, tag] };
    }));
  }
  async function chooseAudio(file?: File) {
    if (!file) return;
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioFile(file); setAudioUrl(URL.createObjectURL(file));
    setFileName(file.name.replace(/\.[^.]+$/, '')); setPlaying(false); setTranscribeError('');
    await saveAudio(file); await transcribeAudio(file);
  }
  async function transcribeAudio(file = audioFile) {
    if (!file) return;
    setTranscribing(true); setTranscribeError('');
    const form = new FormData(); form.append('file', file);
    try {
      const response = await fetch('http://127.0.0.1:8765/transcribe', { method: 'POST', body: form });
      const result = await response.json() as { sentences?: Sentence[]; detail?: string };
      if (!response.ok || !result.sentences?.length) throw new Error(result.detail || '没有识别到句子');
      setSentences(result.sentences); setActiveIndex(0); setAnswer(''); setShowResult(false);
    } catch (error) {
      setTranscribeError(error instanceof TypeError ? '本地转写服务未启动。请运行 start.ps1 后重试。' : error instanceof Error ? error.message : '转写失败');
    } finally { setTranscribing(false); }
  }
  function openReviewSentence(index: number) { selectSentence(index); setView('practice'); }

  return (
    <main className="min-h-screen">
      <audio ref={audioRef} src={audioUrl} onPause={() => setPlaying(false)} onPlay={() => setPlaying(true)} />
      <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-[#07101f]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between px-5 lg:px-8">
          <button className="flex items-center gap-3 text-left" onClick={() => setView('practice')}>
            <span className="grid size-9 place-items-center rounded-xl bg-cyan-300 text-slate-950"><Headphones size={20} strokeWidth={2.4} /></span>
            <div><div className="font-bold tracking-[.16em]">听见</div><div className="text-[11px] text-slate-500">TOEFL LISTENING LAB</div></div>
          </button>
          <nav className="hidden items-center gap-2 sm:flex" aria-label="主要导航">
            <NavButton active={view === 'practice'} icon={<Headphones />} onClick={() => setView('practice')}>精听训练</NavButton>
            <NavButton active={view === 'review'} icon={<BookMarked />} onClick={() => setView('review')}>错句本</NavButton>
            <NavButton active={view === 'stats'} icon={<BarChart3 />} onClick={() => setView('stats')}>统计</NavButton>
          </nav>
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}><Upload />导入音频</Button>
          <input ref={fileRef} className="hidden" type="file" accept="audio/*" onChange={(event) => void chooseAudio(event.target.files?.[0])} />
        </div>
        <nav className="flex items-center justify-center gap-1 border-t border-slate-800/70 px-3 py-2 sm:hidden" aria-label="移动端导航">
          <NavButton active={view === 'practice'} icon={<Headphones />} onClick={() => setView('practice')}>训练</NavButton>
          <NavButton active={view === 'review'} icon={<BookMarked />} onClick={() => setView('review')}>错句</NavButton>
          <NavButton active={view === 'stats'} icon={<BarChart3 />} onClick={() => setView('stats')}>统计</NavButton>
        </nav>
      </header>
      {transcribing && <div className="fixed inset-x-0 top-16 z-30 flex items-center justify-center gap-2 bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950"><LoaderCircle className="animate-spin" size={17} />正在本地识别并断句，首次运行需要下载模型…</div>}

      {view === 'practice' && active && (
        <section className="mx-auto grid max-w-[1500px] grid-cols-1 lg:grid-cols-[310px_minmax(0,1fr)_290px]">
          <aside className="border-b border-slate-800/80 lg:min-h-[calc(100vh-64px)] lg:border-b-0 lg:border-r">
            <div className="border-b border-slate-800/80 p-5">
              <div className="mb-3 flex items-start justify-between gap-3"><div><p className="mb-1 text-xs font-semibold uppercase tracking-[.14em] text-cyan-300">Lecture · English</p><h1 className="text-lg font-semibold leading-snug">{fileName}</h1></div><FileAudio className="mt-1 shrink-0 text-slate-600" /></div>
              <div className="flex items-center gap-3 text-xs text-slate-500"><span>{sentences.length} 句</span><span>·</span><span>{formatTime(sentences.at(-1)?.end ?? 0)}</span><span>·</span><span>{progress}%</span></div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-cyan-300 transition-all" style={{ width: `${progress}%` }} /></div>
            </div>
            <div className="flex gap-2 overflow-x-auto p-3 lg:block lg:max-h-[calc(100vh-206px)] lg:space-y-1 lg:overflow-y-auto">
              {sentences.map((sentence, index) => <button key={sentence.id} onClick={() => selectSentence(index)} className={`min-w-56 rounded-xl border p-3 text-left transition lg:w-full ${index === activeIndex ? 'border-cyan-400/40 bg-cyan-400/10' : 'border-transparent hover:bg-slate-800/50'}`}><div className="flex items-center justify-between"><span className={`text-xs font-bold ${index === activeIndex ? 'text-cyan-300' : 'text-slate-500'}`}>句子 {String(index + 1).padStart(2, '0')}</span>{sentence.done ? <Check className="size-4 text-emerald-400" /> : <span className="text-[11px] text-slate-600">{formatTime(sentence.start)}</span>}</div><p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-400">{sentence.done ? sentence.text : '••••••••••••••••••••••'}</p></button>)}
            </div>
          </aside>

          <div className="min-w-0 px-5 py-7 lg:px-10 lg:py-9"><div className="mx-auto max-w-3xl">
            {transcribeError && <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/[.07] p-4 text-sm text-amber-100"><AlertCircle className="mt-0.5 shrink-0" size={18} /><div className="flex-1"><p>{transcribeError}</p>{audioFile && <button className="mt-2 font-semibold text-amber-200 underline underline-offset-4" onClick={() => void transcribeAudio()}>重新尝试</button>}</div></div>}
            <div className="mb-8 flex items-center justify-between"><div><p className="text-sm font-semibold text-cyan-300">句子 {activeIndex + 1} / {sentences.length}</p><p className="mt-1 text-xs text-slate-500">先听懂意思，再写下你听到的每个词</p></div><div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/50 p-1"><Button variant="ghost" size="icon" aria-label="上一句" disabled={activeIndex === 0} onClick={() => selectSentence(activeIndex - 1)}><ChevronLeft /></Button><Button variant="ghost" size="icon" aria-label="下一句" disabled={activeIndex === sentences.length - 1} onClick={() => selectSentence(activeIndex + 1)}><ChevronRight /></Button></div></div>
            <div className="rounded-3xl border border-slate-800 bg-slate-900/65 p-5 shadow-2xl shadow-black/20 sm:p-7">
              <div className="mb-7 flex h-24 items-center justify-center gap-[5px] overflow-hidden rounded-2xl bg-slate-950/70 px-6">{waveHeights.map((height, index) => <span key={index} className={`wave-bar w-1 rounded-full ${playing ? 'bg-cyan-300' : 'bg-slate-700'}`} style={{ height, animationPlayState: playing ? 'running' : 'paused' }} />)}</div>
              <div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-2"><Button variant="ghost" size="icon" aria-label="重新播放" disabled={!audioUrl} onClick={() => { if (audioRef.current) { audioRef.current.currentTime = active.start; incrementReplay(); } }}><RotateCcw /></Button><Button size="icon" className="size-14 rounded-2xl" aria-label={playing ? '暂停' : '播放'} disabled={!audioUrl} onClick={togglePlay}>{playing ? <Pause className="size-5" /> : <Play className="ml-0.5 size-5" />}</Button><Button variant={loop ? 'secondary' : 'ghost'} size="icon" aria-label="单句循环" onClick={() => setLoop(!loop)}><Repeat2 /></Button></div><div className="flex items-center gap-2"><span className="text-xs text-slate-500">速度</span>{[0.75, 1, 1.25].map((value) => <button key={value} onClick={() => setSpeed(value)} className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${speed === value ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-white'}`}>{value}×</button>)}<span className="ml-2 font-mono text-xs text-slate-500">{formatTime(active.start)} — {formatTime(active.end)}</span></div></div>
              {!audioUrl && <button onClick={() => fileRef.current?.click()} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-700 py-3 text-sm text-slate-400 transition hover:border-cyan-400/50 hover:text-cyan-200"><Upload size={16} />导入音频，自动转写并断句</button>}
            </div>
            <div className="mt-7"><div className="mb-3 flex items-center justify-between"><label htmlFor="dictation" className="text-sm font-semibold">你的听写</label><span className="hidden text-xs text-slate-600 sm:inline">Enter 提交 · Shift + Enter 换行</span></div><Textarea id="dictation" value={answer} onChange={(event) => { setAnswer(event.target.value); setShowResult(false); }} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submitAnswer(); } }} placeholder="输入你听到的英文句子…" /><div className="mt-4 flex justify-end"><Button onClick={submitAnswer} disabled={!answer.trim()}>对照原文 <Sparkles /></Button></div></div>
            {showResult && <div className="mt-7 rounded-2xl border border-slate-800 bg-slate-900/50 p-5"><div className="mb-3 flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[.15em] text-slate-500">原文对照</p><strong className="text-sm text-cyan-300">{accuracy(answer, active.text)}%</strong></div><p className="text-lg leading-9">{diff.map(({ text, kind }, index) => <span key={`${text}-${index}`} className={kind === 'correct' ? 'text-slate-200' : kind === 'missing' ? 'mr-1 rounded bg-rose-400/15 px-1 py-0.5 text-rose-300 underline decoration-rose-400/50 decoration-wavy underline-offset-4' : 'mr-1 rounded bg-amber-300/10 px-1 py-0.5 text-amber-200 line-through'}>{text}{' '}</span>)}</p><div className="mt-4 flex gap-4 text-xs"><span className="text-rose-300">红色：遗漏 / 错词</span><span className="text-amber-200">黄色：多写</span></div></div>}
          </div></div>

          <aside className="border-t border-slate-800/80 p-5 lg:min-h-[calc(100vh-64px)] lg:border-l lg:border-t-0 lg:p-6">
            <section><div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-semibold">本次训练</h2><span className="text-xs text-slate-500">本地保存</span></div><div className="grid grid-cols-3 gap-2 lg:grid-cols-1">{[['已完成', `${completed} / ${sentences.length}`], ['听写正确率', completed ? `${overallAccuracy}%` : '—'], ['重听次数', `${sentences.reduce((sum, sentence) => sum + (sentence.replayCount ?? 0), 0)} 次`]].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-800 bg-slate-900/45 p-3 lg:flex lg:items-center lg:justify-between"><span className="text-xs text-slate-500">{label}</span><strong className="mt-1 block text-lg text-slate-200 lg:mt-0 lg:text-sm">{value}</strong></div>)}</div></section>
            <section className="mt-8"><h2 className="mb-2 text-sm font-semibold">错误标签</h2><p className="mb-4 text-xs leading-5 text-slate-500">选中这句话没听出来的原因</p><div className="flex flex-wrap gap-2">{errorTags.map((tag) => <button key={tag} onClick={() => toggleTag(tag)} className={`rounded-lg border px-3 py-2 text-xs transition ${(active.tags ?? []).includes(tag) ? 'border-amber-300/50 bg-amber-300/10 text-amber-200' : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white'}`}>{tag}</button>)}</div></section>
            <section className="mt-8 rounded-2xl border border-cyan-400/15 bg-cyan-400/[.06] p-4"><p className="text-xs font-bold text-cyan-300">今日进度</p><div className="mt-3 flex items-end justify-between"><strong className="text-3xl font-semibold">{completed}</strong><span className="pb-1 text-xs text-slate-500">目标 20 句</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-cyan-300" style={{ width: `${Math.min(100, completed * 5)}%` }} /></div></section>
          </aside>
        </section>
      )}

      {view === 'review' && <section className="mx-auto max-w-5xl px-5 py-10 lg:px-8"><div className="mb-8"><p className="text-sm font-semibold text-cyan-300">错句复习</p><h1 className="mt-2 text-3xl font-semibold">把没听懂的，再听懂一次</h1><p className="mt-2 text-sm text-slate-500">已收集 {mistakes.length} 句，掌握后仍会保留历史记录。</p></div>{mistakes.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-700 py-20 text-center"><CircleCheckBig className="mx-auto mb-4 text-emerald-400" size={36} /><h2 className="font-semibold">目前没有错句</h2><p className="mt-2 text-sm text-slate-500">在听写页面添加错误标签后，句子会出现在这里。</p></div> : <div className="space-y-3">{mistakes.map((sentence) => { const index = sentences.findIndex((item) => item.id === sentence.id); return <article key={sentence.id} className="rounded-2xl border border-slate-800 bg-slate-900/55 p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="mb-2 flex flex-wrap items-center gap-2"><span className="text-xs font-bold text-cyan-300">句子 {index + 1}</span>{sentence.tags?.map((tag) => <span key={tag} className="rounded-md bg-amber-300/10 px-2 py-1 text-[11px] text-amber-200">{tag}</span>)}</div><p className="leading-7 text-slate-200">{sentence.text}</p><p className="mt-2 text-xs text-slate-500">正确率 {accuracy(sentence.answer ?? '', sentence.text)}% · 重听 {sentence.replayCount ?? 0} 次</p></div><div className="flex shrink-0 gap-2"><Button variant="outline" size="sm" onClick={() => openReviewSentence(index)}><Play />重新听写</Button><Button variant={sentence.mastered ? 'secondary' : 'ghost'} size="sm" onClick={() => setSentences((current) => current.map((item) => item.id === sentence.id ? { ...item, mastered: !item.mastered } : item))}><Check />{sentence.mastered ? '已掌握' : '标记掌握'}</Button></div></div></article>; })}</div>}</section>}

      {view === 'stats' && <section className="mx-auto max-w-6xl px-5 py-10 lg:px-8"><div className="mb-8"><p className="text-sm font-semibold text-cyan-300">训练统计</p><h1 className="mt-2 text-3xl font-semibold">这次练习，哪里进步了</h1></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[[<Check key="i" />, '完成句子', String(completed)], [<Sparkles key="i" />, '平均正确率', `${overallAccuracy}%`], [<RotateCcw key="i" />, '累计重听', String(sentences.reduce((sum, sentence) => sum + (sentence.replayCount ?? 0), 0))], [<BookMarked key="i" />, '待复习错句', String(mistakes.filter((sentence) => !sentence.mastered).length)]].map(([icon, label, value]) => <div key={String(label)} className="rounded-2xl border border-slate-800 bg-slate-900/55 p-5"><span className="text-cyan-300">{icon}</span><p className="mt-5 text-sm text-slate-500">{label}</p><strong className="mt-1 block text-3xl">{value}</strong></div>)}</div><div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_.7fr]"><section className="rounded-2xl border border-slate-800 bg-slate-900/55 p-5"><div className="mb-6 flex items-center gap-2"><BarChart3 className="text-cyan-300" /><h2 className="font-semibold">逐句正确率</h2></div><div className="flex h-56 items-end gap-2">{sentences.map((sentence, index) => { const value = sentence.done ? accuracy(sentence.answer ?? '', sentence.text) : 0; return <div key={sentence.id} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-2"><div className="relative flex-1 rounded-lg bg-slate-800/60"><div className="absolute inset-x-0 bottom-0 rounded-lg bg-gradient-to-t from-cyan-500 to-cyan-300 transition-all" style={{ height: `${value}%` }} /></div><span className="text-center text-[11px] text-slate-600">{index + 1}</span></div>; })}</div></section><section className="rounded-2xl border border-slate-800 bg-slate-900/55 p-5"><div className="mb-6 flex items-center gap-2"><Tags className="text-amber-300" /><h2 className="font-semibold">错误分布</h2></div><div className="space-y-4">{errorTags.map((tag) => { const count = sentences.filter((sentence) => sentence.tags?.includes(tag)).length; const max = Math.max(1, ...errorTags.map((item) => sentences.filter((sentence) => sentence.tags?.includes(item)).length)); return <div key={tag}><div className="mb-1.5 flex justify-between text-sm"><span className="text-slate-400">{tag}</span><span>{count}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-amber-300" style={{ width: `${(count / max) * 100}%` }} /></div></div>; })}</div></section></div></section>}
    </main>
  );
}
