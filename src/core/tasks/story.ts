// Consistency between what is heard and what is seen. A system rule: every script written or revised for any channel
// carries it, whatever the skill says, so it does not depend on a skill remembering it.
export const VISUAL_BRIEF = `Luật hình ảnh (bắt buộc, ưu tiên hơn mọi hướng dẫn khác về chọn khối và tả ảnh):
- Hình khớp lời: người xem phải THẤY đúng điều đang nghe, đúng lúc đó: đúng người, đúng việc, đúng vật. Câu kể một người sinh ra vật lạ thì hình có người đó, người đỡ và vật lạ; không thay bằng phòng trống, con số hay nhân vật khác.
- Video kể chuyện hoặc series có nhân vật vẽ: MỌI cảnh đều có hình vẽ (tranh hoặc nhân vật diễn), kể cả câu đúc kết hay bài học; không dùng cảnh chỉ có chữ trên nền trơn.
- Mỗi khoảnh khắc một cảnh: một biến đổi hay chuỗi hành động (vật xuất hiện, bay lên, hoá thành người) tách thành nhiều cảnh liền nhau, lời đọc chia đúng theo các khoảnh khắc ấy.
- Nhân vật chỉ xuất hiện khi câu chuyện đang có họ, đúng tuổi và hình dạng lúc đó: chưa ra đời thì chưa có trong hình, lúc còn là em bé thì vẽ em bé.
- Chọn cách dựng cho từng cảnh, cân nhắc kỹ. Nhân vật rời (diễn trên phông nền) chỉ khi: người cần thấy đều đã có ảnh trong dàn nhân vật, và câu là lời nói, cảm xúc hay động tác đơn giản (đứng, đi, chỉ, vẫy, cúi, ngồi). Tranh vẽ liền khi: người chạm vào nhau hay vào đồ vật (bế, đỡ, ôm, trao, che chở, giao đấu), biến đổi, tư thế nằm hay quỳ, đám đông, toàn cảnh, hoặc có người chưa có ảnh. Không chắc nhân vật rời diễn được đúng câu thì dùng tranh.
- Giữ nhất quán: người hay vật không có ảnh chuẩn mà xuất hiện nhiều lần thì chọn một mô tả cố định (tuổi, tóc, trang phục, màu sắc) và chép lại nguyên văn vào mô tả ảnh của MỌI cảnh có họ. Bối cảnh lặp lại cũng tả giống nhau.`;

// How a tale is told to someone who has never heard it. A system rule, not a skill: any channel that tells folk tales,
// myths, history or any other story needs it. It says when it applies, so explainers and listicles are left alone.
export const TALE_BRIEF = `Luật kể chuyện (bắt buộc khi video kể một câu chuyện: cổ tích, thần thoại, truyền thuyết, lịch sử, truyện nhân vật; video giải thích hay giới thiệu thì bỏ qua phần này):
- Người xem chưa biết gì về truyện. Thà thêm cảnh còn hơn nhảy cóc.
- Đủ năm phần theo thứ tự: (1) lời mở một cảnh gợi tò mò; (2) dẫn nhập trước mọi sự việc, ít nhất ba cảnh ở tập đầu: cảnh đầu mở kiểu "Truyền thuyết kể rằng, vào thời…" và GỌI TÊN thời đại hay triều đại (truyện không rõ thời thì nói "ngày xửa ngày xưa"); rồi nơi chốn và đó là nơi gì; rồi từng nhân vật chính là ai, tính tình, gia đình (con cái, anh em), cuộc sống trước biến cố; (3) biến cố: điều lạ bắt đầu từ đâu và vì sao; (4) diễn biến và đỉnh điểm, kèm cảm xúc và lời nói của người trong cuộc; (5) kết: giải quyết ra sao, nhân vật đổi thế nào, điều đáng nhớ.
- Không ai, không vật nào xuất hiện mà chưa được giới thiệu; tên riêng lần đầu kèm vai trò ("tướng Lý Tịnh, người trấn giữ cửa ải"). Nguồn gốc điều kỳ lạ phải được kể. Sự việc nào cũng có nguyên nhân người xem đã nghe.
- Giọng người kể chuyện ("Truyền thuyết kể rằng…", "Thuở ấy…", "Một hôm…"), không lặp một kiểu mở câu. Theo đúng truyện gốc; chỗ nhiều dị bản thì nói "có người kể rằng".
- Tập tiếp theo của series: nhắc lại một hai cảnh (ai, đang ở đâu, tập trước dừng ở đâu) rồi mới kể tiếp.`;

// Craft requirements appended to every script-writing task, whatever the kind of channel.
export const STORY_BRIEF = `${TALE_BRIEF}

${VISUAL_BRIEF}

Yêu cầu về mạch chuyện (bắt buộc, cho mọi thể loại kênh):
- Mạch chuyện phải cuốn: mở bằng điều khiến người xem muốn biết câu trả lời ngay; mỗi cảnh kết bằng một mồi dẫn sang cảnh sau (câu hỏi chưa trả lời, mâu thuẫn, điều sắp hé lộ), không để cảnh nào khép kín như một mục riêng.
- Leo thang: mỗi cảnh đẩy câu chuyện lên (lạ hơn, lớn hơn, sâu hơn, gần hơn). Có một bước ngoặt làm đảo hiểu biết ban đầu. Kết trả lời đúng câu hỏi mở đầu rồi mở thêm một hàm ý.
- Cụ thể thay vì khái quát: một chi tiết, con số, hình ảnh, nhân vật cụ thể đáng nhớ hơn mười câu chung chung. Nối các cảnh bằng quan hệ nguyên nhân - hệ quả ("vì vậy", "nhưng", "và rồi"), không liệt kê.
- Viết để NGHE (lời đọc được máy đọc thành tiếng): như một người đang kể chuyện, không như bách khoa. Xen câu dài với câu rất ngắn (2-5 chữ), nói thẳng với người xem ("bạn"), có ít nhất vài câu hỏi dẫn dắt, dùng từ nói hằng ngày; tránh từ sách vở/báo chí sáo rỗng (kinh ngạc, can đảm, khủng khiếp, chấn động...) và tránh mở hai cảnh liền nhau cùng một kiểu. Tự đọc to từng cảnh trong đầu: chỗ nào nghe gượng thì viết lại.
- Có cảnh kết thật sự trả lời câu hỏi mở đầu và để lại một hàm ý. Lời chào/đăng ký của kênh (nếu có) chỉ đứng SAU cảnh kết đó, không thay thế nó. Đừng kết bằng thêm một dữ kiện mới.
- Đa dạng hình thức: các cảnh liên tiếp phải khác nhau về bố cục, cỡ cảnh, góc nhìn và kiểu khối. Dùng hết các lựa chọn (kiểu khung, bố cục, chuyển động) mà khối cho phép, không lặp một lựa chọn hai cảnh liền nhau và không dùng một lựa chọn quá hai lần. Mỗi video một cách mở và kết khác với các tập trước.`;
