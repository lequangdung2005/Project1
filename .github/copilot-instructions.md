StreamFlow - Hướng dẫn cho AI Agent
Tổng quan dự án

StreamFlow là một ứng dụng nghe nhạc cá nhân với frontend React/Vite và backend FastAPI. Frontend chạy ở cổng 3000 (cấu hình trong vite.config.ts), backend chạy tại http://127.0.0.1:2005. Ứng dụng quét các file MP3 cục bộ từ thư mục d:\Study\Code\Python\Project1\music và phát nhạc qua giao diện web với xác thực bằng JWT.

Kiến trúc & Luồng dữ liệu
Giao tiếp Frontend → Backend

Frontend lấy danh sách bài hát từ GET /api/songs/ và map thêm trường audioUrl: http://127.0.0.1:2005/api/stream/${song.id}

Stream audio qua GET /api/stream/{song_id} trả về FileResponse với đường dẫn file MP3

Quét nhạc thủ công qua POST /api/scan-music (chạy như background task)

Xác thực qua POST /api/auth/signup và POST /api/auth/login, trả về JWT token

Yêu thích (favorites) quản lý bằng quan hệ nhiều-nhiều (user_favorites trong models.py)

Gợi ý nhạc:

GET /api/recommendations (cá nhân hóa)

GET /api/similar/{song_id} (dựa trên nội dung)

GET /api/trending (theo độ phổ biến)

Theo dõi việc nghe:

POST /api/play-history lưu sự kiện nghe

POST /api/skips lưu sự kiện bỏ qua, dùng cho thuật toán gợi ý

Mẫu xác thực (Authentication Pattern)

JWT token được lưu trong localStorage qua AuthContext (contexts/AuthContext.tsx)

Backend dùng python-jose để tạo token và Argon2 để hash mật khẩu (qua passlib[argon2])

Model User gồm: username (unique), email (unique), hashed_password, created_at, favorites (relationship)

Luồng auth: đăng ký → tự động đăng nhập → lưu token → cập nhật state người dùng

Logout sẽ xóa localStorage và reset state xác thực

Mẫu cơ sở dữ liệu (Database Pattern)

Quan trọng: backend/database.py dùng SQLite (streamflow.db ở root project)

6 bảng:

songs (metadata + đặc trưng audio)

users (xác thực)

user_favorites (nhiều-nhiều)

play_history (log nghe)

skips (log skip)

audio_features (phân tích audio nâng cao)

Model Song mở rộng với: genre, year, play_count, skip_count, và các đặc trưng audio (bpm, energy, danceability, valence, acousticness)

PlayHistory lưu: listen_duration, completion_rate, cờ completed (>80% = coi như nghe xong)

Models dùng SQLAlchemy ORM (backend/models.py) với relationship cho favorites, play history, skips

Tạo DB qua models.Base.metadata.create_all(bind=engine) trong main.py

Cần SQLAlchemy >= 2.0.44 để tương thích Python 3.13

Logic quét nhạc (backend/scan_music.py)

Quét thư mục PROJECT_ROOT / "music" đệ quy, chỉ lấy file .mp3

Dùng mutagen.mp3.MP3 để đọc ID3 tag (TIT2=title, TPE1=artist, TALB=album, duration)

Tránh trùng lặp bằng cách kiểm tra Song.file_path đã tồn tại chưa

Chạy bằng FastAPI BackgroundTasks để không block API

Tích hợp AI Assistant

Dùng OpenAI-compatible API với model DeepSeek (deepseek-ai/deepseek-v3.1)

API key: OPENAI_API_KEY và OPENAI_BASE_URL trong .env.local, inject qua vite.config.ts

geminiService.ts dùng package openai với dangerouslyAllowBrowser: true

Lịch sử chat lưu ở frontend (components/AIAssistant.tsx) và chuyển sang format message của OpenAI

System instruction: đóng vai “Melody”, một trợ lý kiến thức âm nhạc ngắn gọn

Hệ thống hàng đợi bài hát & sắp xếp

Cấu trúc Queue tự cài (utils/Queue.ts) dạng FIFO linked list

Thêm bài vào queue qua addToQueue() trong App.tsx, lấy ra qua playNextInQueue() khi hết bài

State queueVersion để trigger re-render khi queue thay đổi

Backend theo dõi play_count và skip_count và trả về trong schema Song

Hệ thống gợi ý (backend/recommendations.py)

Cách tiếp cận hybrid:

Content-based (60%)

Collaborative (40%)

Popularity boost (10%)

Content-based: so genre, artist, và audio features (BPM, energy, valence, …) bằng cosine similarity

Collaborative: phân tích pattern đồng xuất hiện trong play history (các bài được nghe trong cửa sổ 2 giờ)

Lớp RecommendationEngine cung cấp:

get_recommendations()

get_similar_songs()

get_trending_songs()

Player log sự kiện nghe xong (>80%) hoặc skip để huấn luyện thuật toán

Dùng scikit-learn cho similarity và numpy cho xử lý ma trận

Có cài MergeSort (utils/MergeSort.ts) với comparator tổng quát để sort theo playCount, releaseDate, duration

Frontend bổ sung thêm cho Song:

audioUrl, coverUrl, playCount, releaseDate (tạo phía client để test)

Quy ước quan trọng
Đường dẫn (Path Resolution)

Backend dùng pathlib.Path(__file__).parent.parent để lấy project root (không dùng os.getcwd())

Frontend dùng alias @ của Vite trỏ về project root (vite.config.ts, tsconfig.json)

Kiểu dữ liệu TypeScript

types.ts định nghĩa interface Song với audioUrl và coverUrl (chỉ có ở frontend)

Backend schema (schemas.py) dùng Pydantic với orm_mode = True

Frontend có:

Enum View cho điều hướng (HOME, LIBRARY, RECOMMENDATIONS, AI_CHAT)

State cho auth modal, song queue, sort order, favorites, recommendations…

Audio playback điều khiển bằng useRef<HTMLAudioElement> trong Player.tsx

Player theo dõi tiến trình nghe và log complete/skip về backend

Quản lý state

Không dùng global state library, chỉ dùng useState trong App.tsx cho:

Bài hiện tại / trạng thái play

Danh sách bài (fetch 1 lần khi mount)

View navigation

Auth modal

Song queue + queueVersion

Sort order

Favorites

State xác thực dùng React Context (AuthContext) bọc toàn app trong index.tsx

Quy trình phát triển
Chạy ứng dụng

Backend: uvicorn backend.main:app --reload --port 2005

Frontend: npm run dev (Vite cổng 3000)

Quét nhạc:
curl -X POST http://127.0.0.1:2005/api/scan-music (Windows dùng PowerShell hoặc Git Bash)

Tạo tài khoản: bấm “Sign Up” trong UI → tự login sau khi đăng ký

Môi trường Python, scikit-learn, numpy

Cần SQLAlchemy >= 2.0.44 cho Python 3.13

Quan trọng: dùng Argon2 để hash mật khẩu (an toàn hơn bcrypt) → cần passlib[argon2] và argon2-cffi

Hệ gợi ý cần scikit-learn và numpy

Các dependency chính:

fastapi, uvicorn, sqlalchemy>=2.0.44, mutagen, python-jose[cryptography],

passlib[argon2], argon2-cffi, pydantic[email]

Build frontend

Build: npm run build

Preview: npm run preview

ESLint cấu hình cho .tsx, không cho warning

Các lỗi thường gặp

Chưa init database: Nếu database.py trống, phải cài trước khi chạy backend

Thiếu thư mục music/: Backend yêu cầu có music/ ở root project

Lỗi API key: AI cần OPENAI_API_KEY và OPENAI_BASE_URL trong .env.local

Trùng cổng: Frontend config 3000 nhưng doc có nhắc 5173 → kiểm tra cổng thực tế

Lỗi path Windows: dùng pathlib trong scan_music.py để cross-platform

Sai cổng backend: Phải dùng 2005 (không phải 8000)

Các file quan trọng

contexts/AuthContext.tsx: quản lý state xác thực

components/AuthModal.tsx: form login/signup

components/Player.tsx: phát nhạc + log progress

components/Recommendations.tsx: hiển thị gợi ý

backend/main.py: routes FastAPI

backend/auth.py: logic auth (hash, JWT, CRUD user)

backend/models.py: SQLAlchemy models

backend/schemas.py: Pydantic schemas

backend/scan_music.py: quét thư viện nhạc

backend/recommendations.py: engine gợi ý hybrid

services/geminiService.ts: tích hợp AI chat

utils/Queue.ts: queue FIFO

utils/MergeSort.ts: merge sort

vite.config.ts: config port frontend, inject API key, alias path