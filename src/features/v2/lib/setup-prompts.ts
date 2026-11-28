/**
 * The request each "AI làm" button on the setup checklist puts in front of the person. It goes to the one assistant
 * (through AskAiButton: the person can edit it, nothing is sent or spent until they confirm). Each asks for ONE part,
 * step by step, and for a go-ahead before anything is saved or paid for.
 */
export type SetupKey = 'general' | 'knowledge' | 'style' | 'skill' | 'introArt' | 'outroArt';

export interface SetupFacts {
  name: string;
  description: string;
  audience: string;
  imageStyle: string;
}

const RULES = `Cách làm: chỉ làm phần này, từng bước, không đụng phần khác của dự án. Trước khi lưu bất cứ thứ gì hãy cho tôi xem bản đề xuất và đợi tôi đồng ý. Thiếu thông tin thì hỏi tôi ngắn gọn, đừng tự bịa. Xong thì tóm tắt đã lưu gì.`;

const have = (label: string, value: string) => `- ${label}: ${value.trim() || '(chưa có)'}`;

export function setupPrompt(key: SetupKey, f: SetupFacts): { title: string; prompt: string } {
  const now = [have('Tên', f.name), have('Mô tả', f.description), have('Khán giả', f.audience), have('Phong cách hình vẽ', f.imageStyle)].join('\n');
  switch (key) {
    case 'general':
      return {
        title: 'AI hoàn thiện thông tin chung',
        prompt: `Hãy hoàn thiện THÔNG TIN CHUNG của dự án "${f.name}": mô tả dự án và khán giả mục tiêu.

Hiện có:
${now}

Các bước:
1. Đọc kỹ dự án hiện tại (tên, series, tri thức, các tập đã có) để hiểu dự án nói về gì.
2. Đề xuất mô tả (1-2 câu, nói rõ video kể gì và kể cho ai) và khán giả (độ tuổi, mối quan tâm, trình độ).
3. Cho tôi xem hai đề xuất, đợi tôi sửa hoặc đồng ý, rồi mới lưu vào thông tin kênh.

${RULES}`,
      };
    case 'knowledge':
      return {
        title: 'AI viết tri thức của dự án',
        prompt: `Hãy viết TRI THỨC cho dự án "${f.name}": những sự thật, quy tắc và nguồn mà mọi video của dự án phải bám theo (nhân vật, bối cảnh, mốc thời gian, điều không được nói sai).

Hiện có:
${now}

Các bước:
1. Đọc thông tin dự án, series và các tập đã có để biết đã nói gì.
2. Liệt kê những gì cần chắc chắn đúng; việc nào bạn không chắc thì đánh dấu để tôi kiểm tra, không bịa.
3. Viết tri thức dạng Markdown ngắn, rõ ràng, chia mục. Cho tôi xem bản nháp và đợi tôi đồng ý rồi mới lưu thành phiên bản mới.

${RULES}`,
      };
    case 'style':
      return {
        title: 'AI đặt phong cách hình vẽ',
        prompt: `Hãy đặt PHONG CÁCH HÌNH VẼ cho dự án "${f.name}": một đoạn mô tả để AI vẽ mọi ảnh cùng một phong cách (nét vẽ, màu sắc, ánh sáng, độ chi tiết, điều cần tránh).

Hiện có:
${now}

Các bước:
1. Đọc mô tả, khán giả và tri thức để chọn phong cách hợp nội dung và người xem.
2. Đề xuất 2-3 hướng khác nhau, mỗi hướng một đoạn mô tả ngắn bằng tiếng Việt, kèm gợi ý bảng màu nếu dự án chưa có.
3. Đợi tôi chọn hoặc sửa một hướng, rồi mới lưu. Không vẽ ảnh nào trong bước này (vẽ ảnh tốn tiền).

${RULES}`,
      };
    case 'skill':
      return {
        title: 'AI chọn skill cho dự án',
        prompt: `Hãy chọn và cài SKILL (cách làm video) cho dự án "${f.name}", rồi đặt làm skill mặc định.

Hiện có:
${now}

Các bước:
1. Xem các skill trong kho và skill dự án đã cài.
2. Chọn 1-2 skill hợp nhất với nội dung và khán giả, nói rõ vì sao và skill đó làm video kiểu gì.
3. Đợi tôi đồng ý rồi mới cài và đặt mặc định. Nếu không skill nào hợp, đề nghị viết một skill riêng và cho tôi xem dàn ý trước.

${RULES}`,
      };
    case 'introArt':
    case 'outroArt': {
      const part = key === 'introArt' ? 'mở đầu (intro)' : 'kết (outro)';
      return {
        title: `AI làm tranh nền ${key === 'introArt' ? 'intro' : 'outro'}`,
        prompt: `Hãy làm TRANH NỀN cho cảnh ${part} của dự án "${f.name}".

Hiện có:
${now}

Các bước:
1. Đề xuất ý tưởng tranh (bố cục, màu, không có chữ trong ảnh) hợp với phong cách hình vẽ và tên dự án.
2. Nói rõ sẽ vẽ 1 ảnh và chi phí ước tính, rồi ĐỢI TÔI ĐỒNG Ý trước khi vẽ.
3. Sau khi vẽ xong cho tôi xem kết quả và hỏi có cần chỉnh không.

${RULES}`,
      };
    }
  }
}
