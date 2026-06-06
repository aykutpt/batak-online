# Batak Online

Gerçek zamanlı çevrimiçi Türk Batak kart oyunu.  
React + TypeScript + Socket.IO + Tailwind CSS

**Canlı:** https://batak-online.onrender.com

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
│       ├── types/server.ts       # Sunucu tarafı tipler
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

## Oyun Kuralları

- **İhale:** Minimum 5, herkes pas geçerse ilk oyuncuya zorla 4 ihale verilir
- **Koz kırılmadan açış yasak:** Koz henüz çıkmadan koz ile el açılamaz (elimde sadece koz kalırsa zorunlu açış)
- **Yüksek oyna zorunluluğu:** Yerde koz yoksa elindeki yüksek aynı renk kartı oynamak zorundasın
- **Puanlama:**
  - Declarer başarılı: `+bidAmount`
  - Declarer batık: `-bidAmount`
  - Defender ≥ 1 el: `+elSayısı`
  - Defender 0 el: `-bidAmount`

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
cd server && npm run dev   # → http://localhost:3001
```

### 4. İstemciyi Başlat (ayrı terminalde)

```bash
cd client && npm run dev   # → http://localhost:5173
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

---

## Üretim Dağıtımı — Render + UptimeRobot (Ücretsiz)

Sunucu `client/dist` klasörünü otomatik olarak servis eder; ayrı frontend hosting gerekmez.

### 1. Render Deploy

1. **dashboard.render.com** → GitHub ile kayıt ol (kart gerekmez)
2. "**New → Blueprint**" → `aykutpt/batak-online` reposunu bağla
3. `render.yaml` otomatik okunur → "**Apply**"
4. Deploy biter, URL alırsın: `https://batak-online.onrender.com`

### 2. Uyku Modunu Kapat — UptimeRobot

Render free tier 15 dk hareketsizlikte uyur. UptimeRobot'u şu ayarlarla ekle:

| Alan | Değer |
|------|-------|
| Monitor Type | HTTP(s) |
| URL | `https://batak-online.onrender.com/health` |
| Interval | 5 minutes |

### render.yaml

```yaml
services:
  - type: web
    name: batak-online
    runtime: docker
    dockerfilePath: ./Dockerfile
    region: frankfurt
    plan: free
    envVars:
      - key: NODE_ENV
        value: production
```

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

---

## Kısıtlamalar

1. **Bellek depolama**: Aktif oyunlar yalnızca sunucu RAM'inde tutulur — sunucu yeniden başlarsa oyunlar kaybolur
2. **Bot AI**: Basit sezgisel; kalan kartları takip etmez
3. **Yalnızca 1 oyun modu**: Klasik bireysel Batak; takım versiyonları yok
4. **Yeniden bağlantı süresi**: Şu anda sınırsız

---

## Sonraki İyileştirmeler

1. **Redis depolama** — sunucu yeniden başlatma direnci
2. **Gelişmiş Bot AI** — sayma kartlar, olasılık hesabı
3. **Daha fazla Batak varyantı** — Açık Batak, Takım modu
4. **Animasyonlar** — Framer Motion ile kart hareketi
5. **Ses efektleri** — kart oynama / el kazanma sesleri
6. **Oyuncu avatarları + sohbet**
7. **Mobil uygulama** — React Native
