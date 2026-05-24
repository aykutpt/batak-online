# Batak Online

Gerçek zamanlı çevrimiçi Türk Batak kart oyunu.  
React + TypeScript + Socket.IO + Tailwind CSS

---

## Proje Yapısı

```
batak-online/
├── shared/                    # Ortak TypeScript tipleri + saf oyun mantığı
│   ├── types.ts               # Card, Seat, GamePhase, tüm Socket.IO payload'ları
│   ├── gameRules.ts           # createDeck, isLegalMove, determineTrickWinner, scoring…
│   └── __tests__/             # 25 birim testi (Vitest)
├── server/                    # Node.js + Express + Socket.IO arka ucu
│   └── src/
│       ├── index.ts              # HTTP sunucusu + Socket.IO + client/dist statik sunumu
│       ├── types/server.ts       # Sunucu tarafı tipler (tam el dahil)
│       ├── rooms/roomManager.ts  # Oda CRUD, oyuncu/bot yönetimi
│       ├── game/gameEngine.ts    # Yetkili oyun motoru
│       ├── game/botAI.ts         # Bot stratejisi (sunucu tarafı)
│       └── socket/handlers.ts   # Tüm Socket.IO event handler'ları
└── client/                    # React + Vite + Tailwind ön ucu
    └── src/
        ├── context/OnlineGameContext.tsx  # Online oyun Socket state makinesi
        ├── game/offlineEngine.ts          # Saf offline oyun mantığı
        ├── game/offlineBotAI.ts           # İstemci tarafı bot AI
        ├── game/socket.ts                 # Socket.IO istemci wrapper
        ├── pages/
        │   ├── HomePage.tsx         # Ana sayfa
        │   ├── CreateRoomPage.tsx   # Oda oluşturma
        │   ├── JoinRoomPage.tsx     # Odaya katılma
        │   ├── RoomListPage.tsx     # Aktif odalar listesi
        │   ├── LobbyPage.tsx        # Oyun bekleme odası
        │   ├── GamePage.tsx         # Oyun ekranı
        │   └── PracticePage.tsx     # Bot ile pratik modu
        └── components/
            ├── Card.tsx, CardBack.tsx
            ├── GameTable.tsx, TrickArea.tsx
            ├── BiddingPanel.tsx, TrumpSelector.tsx
            ├── LobbyTable.tsx, Scoreboard.tsx
            ├── GameOver.tsx, RoundSummary.tsx
            └── index.ts
```

---

## Yerel Geliştirme

### 1. Bağımlılıkları Kur

```bash
cd server && npm install
cd ../client && npm install
cd ../shared && npm install
```

### 2. Ortam Değişkenlerini Ayarla

```bash
# server/.env
PORT=3001
CLIENT_ORIGIN=http://localhost:5173
NODE_ENV=development

# client/.env
VITE_SERVER_URL=http://localhost:3001
```

### 3. Sunucuyu Başlat

```bash
cd server
npm run dev
# → http://localhost:3001
```

### 4. İstemciyi Başlat (ayrı terminalde)

```bash
cd client
npm run dev
# → http://localhost:5173
```

### 5. Testleri Çalıştır

```bash
cd shared && npm test   # 25 oyun mantığı birimi testi
```

---

## Çok Taraflı Oyunu Yerel Test Etme

1. `http://localhost:5173` adresini **Tab 1**'de aç
2. "Oda Kur" → isim gir → oda oluştur
3. Oda kodunu kopyala (ör. `ABC123`)
4. **Tab 2**'yi aç → "Odaya Katıl" → aynı kodu yapıştır
5. Her sekmeyi farklı bir koltukta otur ve hazır işaretle
6. Boş koltuklara bot ekle veya daha fazla sekme aç
7. Tüm 4 koltuk dolduktan sonra oda sahibi "Oyunu Başlat"a basar
8. Her sekme yalnızca kendi elini görür ✓

---

## Üretim Dağıtımı — Fly.io (Ücretsiz, Uyku Yok)

Sunucu `client/dist` klasörü varsa statik dosyaları doğrudan servis ettiği için tüm uygulama **tek bir servisle** deploy edilebilir. Ayrı frontend hosting gerekmez.

### Ön Koşullar

```bash
# Fly CLI kur
# Windows: winget install flyio.flyctl
# macOS:   brew install flyctl
flyctl auth login
```

### 1. Build Al

```bash
# Monorepo kökünde
npm run build --prefix client    # client/dist oluşturulur
npm run build --prefix server    # server/dist oluşturulur
```

### 2. Dockerfile Oluştur (server/ klasöründe)

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Server bağımlılıkları
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

# Server build çıktısı
COPY server/dist ./server/dist

# Client build çıktısı (server tarafından servis edilir)
COPY client/dist ./client/dist

WORKDIR /app/server
ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "dist/index.js"]
```

### 3. Fly.io Uygulaması Oluştur

```bash
# Monorepo kökünde
flyctl launch --no-deploy
# → uygulama adı gir, bölge seç (ams → Avrupa için)
```

Oluşan `fly.toml` dosyasını şu şekilde düzenle:

```toml
[build]
  dockerfile = "Dockerfile"

[http_service]
  internal_port = 3001
  force_https = true

  [[http_service.checks]]
    path = "/health"
    interval = "30s"
    timeout = "5s"

# Uyku modunu kapat — sunucu her zaman ayakta
[http_service.concurrency]
  type = "connections"
  hard_limit = 100

[[vm]]
  size = "shared-cpu-1x"
  memory = "256mb"

[env]
  NODE_ENV = "production"
  PORT = "3001"
```

### 4. Ortam Değişkenini Ayarla

```bash
# CLIENT_ORIGIN = deploy sonrası aldığın Fly.io URL'i
# Tek domain olduğu için aynı URL'i kullan:
flyctl secrets set CLIENT_ORIGIN=https://batak-online.fly.dev
```

### 5. Deploy Et

```bash
flyctl deploy
```

### 6. Uyku Modunu Kapat

Fly.io makinelerinin uyku modunu kapatmak için:

```bash
flyctl scale count 1 --max-per-region 1
flyctl machine update --min-machines-running 1
```

ya da `fly.toml`'a ekle:

```toml
[http_service]
  min_machines_running = 1
```

ardından tekrar `flyctl deploy`.

### Ücretsiz Tier Limitleri

| Kaynak | Ücretsiz Limit | Bu Proje İçin |
|--------|---------------|---------------|
| shared-cpu-1x VM | 2.000 saat/ay | ~744 saat (1 VM, 7/24) ✓ |
| Çıkış trafiği | 160 GB/ay | Kart oyunu için yeterli ✓ |
| Kalıcı disk | 3 GB | Kullanılmıyor (RAM tabanlı) ✓ |

---

## Alternatif: Ayrı Servisler (Vercel + Fly.io)

Eğer global CDN ile daha hızlı frontend istersen:

**Frontend → Vercel**
```bash
cd client && npm run build
# Vercel'de: build command = "npm run build", publish dir = "dist"
# Env: VITE_SERVER_URL=https://batak-online.fly.dev
```

**Backend → Fly.io** (yukarıdaki adımlarla, CLIENT_ORIGIN'i Vercel URL'ine ayarla)

---

## Socket.IO Event Referansı

### İstemci → Sunucu
| Event | Payload | Açıklama |
|-------|---------|----------|
| `createRoom` | `{ playerName, config }` | Yeni oda oluştur |
| `joinRoom` | `{ playerName, roomCode }` | Odaya katıl |
| `reconnectPlayer` | `{ playerId, roomCode }` | Yeniden bağlan |
| `selectSeat` | `{ seat }` | Koltuk seç |
| `setReady` | `{ ready }` | Hazır durumunu değiştir |
| `addBot` | `{ seat }` | Koltuk için bot ekle (sadece host) |
| `removeBot` | `{ seat }` | Botu kaldır (sadece host) |
| `startGame` | — | Oyunu başlat (sadece host) |
| `placeBid` | `{ value }` | İhale ver |
| `selectTrump` | `{ suit }` | Koz seç |
| `playCard` | `{ cardId }` | Kart oyna |
| `startNextRound` | — | Yeni tur (sadece host) |
| `restartGame` | — | Oyunu yeniden başlat (sadece host) |
| `requestGameState` | — | Mevcut durumu iste |

### Sunucu → İstemci
| Event | Payload | Açıklama |
|-------|---------|----------|
| `roomCreated` | `{ roomCode, playerId, lobby }` | Oda oluşturuldu |
| `roomJoined` | `{ roomCode, playerId, lobby }` | Odaya katıldı |
| `roomUpdated` | `LobbyState` | Lobi güncellendi |
| `gameStarted` | `LobbyState` | Oyun başladı |
| `gameStateUpdated` | `PublicGameState` | Herkese genel durum |
| `privateHandUpdated` | `{ hand: Card[] }` | **Yalnızca o oyuncuya** el |
| `trickCompleted` | `{ winnerSeat, trick }` | El tamamlandı |
| `playerDisconnected` | `{ playerName, seat }` | Bağlantı koptu |
| `playerReconnected` | `{ playerName, seat }` | Yeniden bağlandı |
| `reconnected` | `{ roomCode, playerId, gameState }` | Yeniden bağlantı başarılı |
| `errorMessage` | `{ message }` | Hata mesajı |

### HTTP Endpoint
| Method | Path | Açıklama |
|--------|------|----------|
| `GET` | `/health` | Sunucu sağlık kontrolü |

---

## Güvenlik Modeli

- **Sunucu yetkilidir**: İstemci yalnızca istek gönderir, sunucu doğrular
- Özel eller **yalnızca** ilgili oyuncunun socket ID'sine gönderilir
- Tüm hamle doğrulamaları sunucu tarafında tekrar yapılır
- İstemci tarafı kural uygulama sadece UX içindir

---

## Kısıtlamalar

1. **Bellek depolama**: Aktif oyunlar yalnızca sunucu RAM'inde tutulur — sunucu yeniden başlarsa oyunlar kaybolur. Redis veya PostgreSQL eklemek için `roomManager.ts` soyutlanmıştır
2. **Bot AI**: Basit sezgisel; kalan kartları takip etmez
3. **Yalnızca 1 oyun modu**: Klasik bireysel Batak; takım versiyonları yok
4. **Yeniden bağlantı süresi**: Şu anda sınırsız; üretimde süre sınırı eklenebilir

---

## Sonraki İyileştirmeler

1. **Redis depolama** — sunucu yeniden başlatma direnci + yatay ölçekleme
2. **Gelişmiş Bot AI** — sayma kartlar, olasılık hesabı
3. **Daha fazla Batak varyantı** — Açık Batak, Rami Batak, Takım modu
4. **Animasyonlar** — Framer Motion ile kart hareketi
5. **Ses efektleri** — kart oynama / el kazanma sesleri
6. **Oyuncu avatarları + sohbet** — lobi ve oyun içi mesajlaşma
7. **Turnuva modu** — eleme tabloları
8. **Mobil uygulama** — React Native ile aynı paylaşılan mantık
