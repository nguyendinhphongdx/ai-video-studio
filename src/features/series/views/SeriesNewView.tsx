'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ROUTES } from '@/constants/routes';
import { lintFormat } from '@/core/series/format';
import { useCurrentChannel } from '@/features/app';
import { useSkills, useTools } from '@/features/episode';
import { errorMessage } from '@/lib/api/client';

import { BibleEditor } from '../components/BibleEditor';
import { FormatEditor } from '../components/FormatEditor';
import { PublishEditor } from '../components/PublishEditor';
import { RoadmapEditor } from '../components/RoadmapEditor';
import { seriesApi, type SeriesProposal } from '../services/series.api';

function Section({ n, title, children, hint }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`sec-${n}`} className="flex flex-col gap-4 rounded-2xl border bg-card p-5 md:p-6">
      <div>
        <h2 id={`sec-${n}`} className="flex items-center gap-2.5 text-h3 font-bold">
          <span className="grid size-7 place-items-center rounded-full bg-muted text-small">{n}</span>
          {title}
        </h2>
        {hint ? <p className="mt-1 text-small text-muted-foreground">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

/** Step 1: name + skill → a blank proposal built from the skill → edit everything → create the series (v1) with its roadmap. The assistant can do all of this from the chat instead. */
export function SeriesNewView() {
  const router = useRouter();
  const qc = useQueryClient();
  const { current } = useCurrentChannel();
  const { data: skills } = useSkills(current?.id);
  const { data: tools } = useTools();
  const [name, setName] = useState('');
  const [skillId, setSkillId] = useState('');
  const [proposal, setProposal] = useState<SeriesProposal | null>(null);
  const usable = (skills ?? []).filter((s) => !s.issues.some((i) => i.level === 'error'));

  useEffect(() => {
    if (!skillId && usable.length) setSkillId(usable.find((s) => s.id === current?.defaultSkillId)?.id ?? usable[0]!.id);
  }, [usable, skillId, current]);

  const blank = useMutation({
    mutationFn: () => seriesApi.template(current!.id, skillId),
    onSuccess: (p) => setProposal({ ...p, name: name.trim() }),
    onError: (e) => toast.error(errorMessage(e)),
  });
  const create = useMutation({
    mutationFn: (p: SeriesProposal) => seriesApi.create({ channelId: current!.id, name: p.name.trim(), skillId: p.skillId, bible: p.bible, format: p.format, publish: p.publish, roadmap: p.roadmap.map((r) => ({ topic: r.topic.trim(), goal: r.goal.trim() })) }),
    onSuccess: (s) => {
      void qc.invalidateQueries({ queryKey: ['series'] });
      void qc.invalidateQueries({ queryKey: ['episodes'] });
      toast.success('Đã chốt series v1');
      router.push(ROUTES.seriesOf(s.id, 'episodes'));
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const back = (
    <Link href={ROUTES.series} className="flex w-fit items-center gap-1.5 text-small text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4" aria-hidden />
      Tất cả series
    </Link>
  );

  if (!proposal) {
    return (
      <div className="flex max-w-3xl flex-col gap-6">
        {back}
        <PageHeader title="Tạo series mới" description="Muốn nhanh nhất: bấm nút ✨ ở góc màn hình và nói ý tưởng chương trình (ví dụ “lập series 10 tập dạy bé đếm cùng Gà Bông”), trợ lý sẽ viết bible và lộ trình. Hoặc tự dựng từ khung mẫu ở dưới." />
        <section className="flex flex-col gap-5 rounded-2xl border bg-card p-6">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="series-name">Tên series</Label>
            <Input id="series-name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="VD: Bé học đếm cùng Gà Bông" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="series-skill">Skill của kênh dùng cho series</Label>
            <Select value={skillId} onValueChange={setSkillId}>
              <SelectTrigger id="series-skill" className="w-72">
                <SelectValue placeholder="Chọn skill" />
              </SelectTrigger>
              <SelectContent>
                {usable.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {skills && !usable.length ? (
              <span className="text-caption text-muted-foreground">
                Kênh chưa có skill.{' '}
                <Link href={ROUTES.skills} className="font-semibold text-primary hover:underline">
                  Cài từ market
                </Link>
              </span>
            ) : null}
          </div>
          <Button size="lg" className="w-fit" disabled={!name.trim() || !skillId || !current || blank.isPending} onClick={() => blank.mutate()}>
            {blank.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
            Dựng từ khung mẫu
          </Button>
        </section>
      </div>
    );
  }

  const formatErrors = lintFormat(proposal.format);
  const roadmapOk = proposal.roadmap.length > 0 && proposal.roadmap.every((r) => r.topic.trim().length >= 3);
  const blocker = !proposal.name.trim() ? 'Đặt tên series' : !roadmapOk ? 'Lộ trình cần ít nhất 1 tập, mỗi tập có chủ đề từ 3 ký tự' : formatErrors[0] ?? null;
  return (
    <div className="flex max-w-4xl flex-col gap-6">
      {back}
      <PageHeader title="Xem lại đề xuất" description="Sửa bible, khung tập và thứ tự tập cho vừa ý. Chốt xong vẫn sửa được; mỗi lần lưu tạo phiên bản mới." />
      <Section n={1} title="Tên series">
        <Label htmlFor="new-name" className="sr-only">
          Tên series
        </Label>
        <Input id="new-name" value={proposal.name} maxLength={80} onChange={(e) => setProposal({ ...proposal, name: e.target.value })} className="max-w-md text-body font-bold" />
      </Section>
      <Section n={2} title="Bible" hint="Phần không đổi giữa các tập: nhân vật, câu cửa miệng, điều cấm.">
        <BibleEditor value={proposal.bible} onChange={(bible) => setProposal({ ...proposal, bible })} />
      </Section>
      <Section n={3} title="Khung một tập" hint="Khe khoá lấy nguyên văn, khe AI điền trong giới hạn số cảnh và khối. Đổi thứ tự bằng nút mũi tên.">
        <FormatEditor value={proposal.format} onChange={(format) => setProposal({ ...proposal, format })} tools={tools} />
      </Section>
      <Section n={4} title={`Lộ trình ${proposal.roadmap.length} tập`} hint="Thứ tự dạy từ dễ đến khó. Mỗi tập vào bảng “Lộ trình” của series, chưa tốn công viết.">
        <RoadmapEditor value={proposal.roadmap} onChange={(roadmap) => setProposal({ ...proposal, roadmap })} />
      </Section>
      <Section n={5} title="Mẫu đăng bài">
        <PublishEditor value={proposal.publish} onChange={(publish) => setProposal({ ...proposal, publish })} />
      </Section>
      <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-2xl border bg-card px-4 py-3 shadow-lift">
        <p className="min-w-0 flex-1 text-small text-muted-foreground">{blocker ?? `Sẵn sàng: ${proposal.roadmap.length} tập trong lộ trình.`}</p>
        <Button variant="outline" onClick={() => setProposal(null)} disabled={create.isPending}>
          Làm lại từ đầu
        </Button>
        <Button size="lg" disabled={Boolean(blocker) || create.isPending} onClick={() => create.mutate(proposal)}>
          {create.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <Check aria-hidden />}
          Chốt series v1
        </Button>
      </div>
    </div>
  );
}
