# 🚀 دليل النشر — نظام تبادل الدوام

## المتطلبات المسبقة

- Node.js 20+
- npm 10+
- حساب [Firebase](https://console.firebase.google.com) (تم الإنشاء: `shift-exchange-app`)
- حساب [Netlify](https://app.netlify.com)
- [Firebase CLI](https://firebase.google.com/docs/cli): `npm install -g firebase-tools`

---

## الخطوة 1 — تثبيت Dependencies

```bash
# في مجلد المشروع الرئيسي
npm install

# في مجلد Cloud Functions
cd functions && npm install && cd ..
```

---

## الخطوة 2 — نشر Cloud Functions + Firestore Rules

```bash
# تسجيل الدخول في Firebase CLI
firebase login

# تحديد المشروع
firebase use shift-exchange-app

# نشر Security Rules + Indexes
firebase deploy --only firestore:rules,firestore:indexes

# بناء ونشر Cloud Functions
cd functions && npm run build && cd ..
firebase deploy --only functions
```

### Cloud Functions المنشورة:
| Function | الوصف |
|---|---|
| `selectOffer` | اختيار عرض بشكل ذري (transaction) |
| `cancelSelection` | إلغاء اختيار عرض |
| `adminConfirmOffer` | تأكيد عرض من لوحة الإدارة |
| `setAdminClaim` | منح صلاحية المسؤول لمستخدم |

---

## الخطوة 3 — إعداد أول مسؤول (Admin)

بعد نشر Functions، شغّل هذا الأمر لمنح صلاحية Admin لأول مستخدم:

```bash
firebase functions:call setAdminClaim --data '{"email":"nawaf.ithra@gmail.com"}'
```

> **ملاحظة:** يجب أن يسجل المستخدم دخوله عبر Google أولاً قبل تنفيذ هذا الأمر.

---

## الخطوة 4 — إضافة المحطات الأولية

بعد تسجيل الدخول كمسؤول في `/admin`، أضف المحطات عبر واجهة "إدارة المحطات":
- DMM-A
- DMM-B
- DHA-Main
- KHU-East
- (أي محطات إضافية حسب الحاجة)

---

## الخطوة 5 — النشر على Netlify

### 5a. عبر Netlify CLI
```bash
npm install -g netlify-cli
netlify login
netlify init   # اختر "Create & configure a new site"
netlify deploy --build --prod
```

### 5b. عبر واجهة Netlify
1. اذهب إلى [app.netlify.com](https://app.netlify.com)
2. اضغط **"Add new site" → "Import an existing project"**
3. وصّل مستودع GitHub/GitLab الخاص بك
4. الإعدادات:
   - **Build command:** `npm run build`
   - **Publish directory:** `.next`
   - **Node version:** `20`

### 5c. إضافة متغيرات البيئة في Netlify
في **Site settings → Environment variables**، أضف:

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDomKnqs9rJhvlsW7frrZxm_SRE14toTLA
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=shift-exchange-app.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=shift-exchange-app
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=shift-exchange-app.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=948001311750
NEXT_PUBLIC_FIREBASE_APP_ID=1:948001311750:web:2d6fac2c6a06f9c03c8787
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-5W7N0DSLSX
NEXT_PUBLIC_FIREBASE_FUNCTIONS_REGION=us-central1
```

---

## الخطوة 6 — تفعيل Domain في Firebase Auth

بعد حصولك على رابط Netlify (مثل `your-app.netlify.app`):

1. اذهب إلى **Firebase Console → Authentication → Settings → Authorized domains**
2. اضغط **"Add domain"**
3. أدخل: `your-app.netlify.app` (أو دومينك المخصص)

---

## الخطوة 7 — التحقق النهائي

| التحقق | الخطوة |
|---|---|
| ✅ الصفحة الرئيسية تفتح | افتح الرابط في المتصفح |
| ✅ إنشاء عرض يعمل | اذهب إلى "عروضي" → "إنشاء عرض جديد" |
| ✅ اختيار عرض يعمل | اذهب إلى "العروض المتاحة" → اختر عرضاً |
| ✅ لوحة الإدارة تعمل | اذهب إلى `/admin` → سجّل دخول بـ Google |
| ✅ تصدير Excel يعمل | في الإدارة → "تصدير Excel" |

---

## هيكل المشروع

```
shift-exchange/
├── app/
│   └── [locale]/
│       ├── layout.tsx          # الـ root layout (RTL, Arabic font)
│       ├── page.tsx            # redirect → /ar/offers
│       ├── offers/page.tsx     # العروض المتاحة (calendar + list)
│       ├── my-offers/page.tsx  # عروضي
│       ├── selected/page.tsx   # العروض المختارة
│       └── admin/page.tsx      # لوحة الإدارة
├── components/
│   ├── ui/Navbar.tsx
│   └── offers/
│       ├── OfferCard.tsx
│       ├── OfferCalendar.tsx
│       ├── OfferFilters.tsx
│       ├── OfferForm.tsx
│       └── SelectOfferModal.tsx
├── lib/
│   ├── firebase/
│   │   ├── config.ts           # Firebase init
│   │   ├── auth.ts             # Google + Anonymous auth
│   │   └── firestore.ts        # كل عمليات Firestore
│   └── utils/
│       ├── validation.ts
│       └── exportExcel.ts
├── functions/src/index.ts      # Cloud Functions (4 functions)
├── firestore.rules             # Security Rules
├── firestore.indexes.json      # Composite indexes
├── firebase.json               # Firebase CLI config
├── .env.local                  # متغيرات البيئة (لا ترفعها لـ git!)
└── netlify.toml                # Netlify config
```

---

## ملاحظات أمنية

- ملف `.env.local` **لا يُرفع** إلى git (أضفه في `.gitignore`)
- رموز الموظفين محمية في Firestore Rules (لا يراها إلا المسؤول)
- كل عمليات تغيير الحالة الحساسة تمر عبر Cloud Functions (transactions ذرية)
- Google Auth مقيّد بـ Authorized Domains في Firebase

---

## روابط مفيدة

- [Firebase Console](https://console.firebase.google.com/project/shift-exchange-app)
- [Netlify Dashboard](https://app.netlify.com)
- [Firebase CLI Docs](https://firebase.google.com/docs/cli)
