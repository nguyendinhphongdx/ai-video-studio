'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

import { useChannel } from '@/features/channel/hooks/use-channels';
import { seriesApi } from '@/features/series/services/series.api';

import { Empty, Loading, Page, Topbar } from '../Shell';

const media = (p: string) => `/api/v1/media/${p.split('/').map(encodeURIComponent).join('/')}`;
const EXPRESSION: Record<string, string> = { neutral: 'Bình thường', talk: 'Đang nói', blink: 'Nháy mắt', happy: 'Vui', angry: 'Giận', sad: 'Buồn', surprised: 'Ngạc nhiên' };

interface Bible {
  host?: string;
  characters?: string;
  characterAssets?: string[];
  characterSprites?: Record<string, string>;
  characterCast?: Record<string, string>;
}

/** Project library: the cast of each series (reference, expressions, supporting characters and props) and the project's brand assets. */
export function ProjectLibraryView({ projectId }: { projectId: string }) {
  const project = useChannel(projectId);
  const series = useQuery({ queryKey: ['series', projectId], queryFn: () => seriesApi.list(projectId) });
  const c = project.data;

  return (
    <>
      <Topbar crumbs={[c?.name ?? 'Dự án', 'Thư viện dự án']} />
      <Page>
        <div className="head">
          <div>
            <h1>Thư viện dự án</h1>
            <p>Nhân vật, đạo cụ và tài sản thương hiệu mà mọi tập của dự án dùng chung.</p>
          </div>
        </div>

        {series.isLoading ? (
          <Loading />
        ) : (series.data ?? []).length === 0 ? (
          <Empty title="Dự án chưa có series nào">
            <p className="muted">Nhân vật thuộc về series. Tạo series để có bảng nhân vật.</p>
            <Link className="btn" href="/series/new">
              Tạo series
            </Link>
          </Empty>
        ) : (
          (series.data ?? []).map((s) => {
            const b = s.rules.bible as Bible;
            const sprites = Object.entries(b.characterSprites ?? {});
            const cast = Object.entries(b.characterCast ?? {});
            const ref = b.characterAssets?.[0];
            return (
              <div key={s.id} className="card">
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <div>
                    <span className="eyebrow">Series</span>
                    <h2>{s.name}</h2>
                  </div>
                  <Link className="btn sm" href={`/series/${s.id}`}>
                    Sửa nhân vật
                  </Link>
                </div>
                <div className="row" style={{ alignItems: 'flex-start', gap: 24 }}>
                  <div className="col" style={{ flex: '0 0 200px' }}>
                    <span className="eyebrow">Nhân vật chính</span>
                    {ref ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={media(ref)} alt={b.host ?? 'Nhân vật chính'} className="sprite" style={{ width: '100%', objectFit: 'contain' }} />
                    ) : (
                      <div className="sprite">
                        <span>Chưa có ảnh chuẩn</span>
                      </div>
                    )}
                    <span className="cap">{b.host || 'Chưa đặt người dẫn'}</span>
                  </div>
                  <div className="col grow">
                    <span className="eyebrow">Biểu cảm · {sprites.length}</span>
                    {sprites.length === 0 ? (
                      <span className="cap">Chưa tạo bộ biểu cảm. Cảnh có nhân vật diễn sẽ cần bộ này.</span>
                    ) : (
                      <div className="grid4" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 8 }}>
                        {sprites.map(([k, p]) => (
                          <figure key={k} className="col" style={{ margin: 0, gap: 4 }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={media(p)} alt={EXPRESSION[k] ?? k} className="sprite" style={{ width: '100%', objectFit: 'contain' }} />
                            <figcaption className="cap" style={{ textAlign: 'center' }}>
                              {EXPRESSION[k] ?? k}
                            </figcaption>
                          </figure>
                        ))}
                      </div>
                    )}
                    <span className="eyebrow" style={{ marginTop: 8 }}>
                      Nhân vật phụ và đạo cụ · {cast.length}
                    </span>
                    {cast.length === 0 ? (
                      <span className="cap">Chưa có. Thêm để cảnh không trơ trọi một mình nhân vật chính.</span>
                    ) : (
                      <div className="grid4" style={{ gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 8 }}>
                        {cast.map(([k, p]) => (
                          <figure key={k} className="col" style={{ margin: 0, gap: 4 }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={media(p)} alt={k} className="sprite" style={{ width: '100%', objectFit: 'contain' }} />
                            <figcaption className="mono cap" style={{ textAlign: 'center' }}>
                              {k}
                            </figcaption>
                          </figure>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {b.characters && (
                  <details>
                    <summary className="cap" style={{ cursor: 'pointer' }}>
                      Mô tả nhân vật cho AI
                    </summary>
                    <p className="muted" style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>
                      {b.characters}
                    </p>
                  </details>
                )}
              </div>
            );
          })
        )}

        {c && (
          <div className="card">
            <h2>Thương hiệu</h2>
            <div className="grid4">
              {[
                ['Logo', c.logoUrl],
                ['Người dẫn', c.avatarUrl],
                ['Nền intro', c.introArtUrl],
                ['Nền outro', c.outroArtUrl],
              ].map(([label, url]) => (
                <div key={label} className="col" style={{ gap: 6 }}>
                  {url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt={label ?? ''} className="sprite" style={{ width: '100%', objectFit: 'contain', aspectRatio: '16 / 10' }} />
                  ) : (
                    <div className="sprite" style={{ aspectRatio: '16 / 10' }}>
                      <span>Chưa có</span>
                    </div>
                  )}
                  <span className="cap">{label}</span>
                </div>
              ))}
            </div>
            <span className="cap">Nhạc nền: {c.music === 'none' ? 'không dùng' : c.music.replace(/^media:.*\//, '')}</span>
          </div>
        )}
      </Page>
    </>
  );
}
