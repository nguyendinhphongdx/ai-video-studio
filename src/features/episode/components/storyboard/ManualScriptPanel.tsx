'use client';

import { ClipboardCopy, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { errorMessage } from '@/lib/api/client';

import { useEpisodeAction } from '../../hooks/use-episode';
import { episodeApi } from '../../services/episode.api';

/** No AI configured (or the person prefers Claude): copy the agent's full prompt, paste the answer back. */
export function ManualScriptPanel({ id, feedback }: { id: string; feedback?: string }) {
  const [text, setText] = useState('');
  const [copying, setCopying] = useState(false);
  const importScript = useEpisodeAction(id, (t: string) => episodeApi.importScript(id, t), 'Đã nhập kịch bản');
  const copy = async () => {
    setCopying(true);
    try {
      const { prompt } = await episodeApi.prompt(id, feedback);
      await navigator.clipboard.writeText(prompt);
      toast.success('Đã copy prompt. Dán vào Claude nhé.');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setCopying(false);
    }
  };
  return (
    <section aria-labelledby="manual-h" className="flex flex-col gap-4 rounded-2xl border bg-card p-6">
      <div>
        <h2 id="manual-h" className="text-title font-bold">
          Dán kịch bản từ Claude
        </h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-small text-muted-foreground">
          <li>Bấm Copy prompt: prompt có đủ ngữ cảnh của kênh, skill và khung tập.</li>
          <li>Dán vào Claude (claude.ai hoặc dự án Claude của bạn) rồi gửi.</li>
          <li>Copy nguyên câu trả lời, dán vào ô dưới, bấm Nhập kịch bản.</li>
        </ol>
      </div>
      <Button variant="outline" className="w-fit" onClick={copy} disabled={copying}>
        {copying ? <Loader2 className="animate-spin" aria-hidden /> : <ClipboardCopy aria-hidden />}
        Copy prompt
      </Button>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pasted">Câu trả lời của Claude</Label>
        <Textarea id="pasted" rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder='{"title": "...", "slots": {...}, "publish": {...}}' className="font-mono text-caption" />
      </div>
      <Button className="w-fit" onClick={() => importScript.mutate(text)} disabled={importScript.isPending || text.trim().length < 2}>
        {importScript.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
        Nhập kịch bản
      </Button>
    </section>
  );
}
