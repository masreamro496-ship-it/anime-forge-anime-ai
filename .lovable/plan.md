
# خطة إعادة بناء لعبة كأس العالم — 3D أونلاين بستايل Chibi

طلبك ضخم جداً وفيه عدة مهام مترابطة. هنفذها في **مرحلتين** لأن اللعبة 3D الحقيقية وحدها مشروع كامل، ولو حاولنا كل حاجة في جولة واحدة هيحصل bugs كتير.

---

## المرحلة الأولى (هذه الجولة) — البنية + اللوبي + الملعب 3D + المزامنة

### 1) إعداد Three.js / React Three Fiber
- تثبيت: `three`, `@react-three/fiber`, `@react-three/drei`.
- إنشاء `src/routes/world-cup.play.tsx` من الصفر (استبدال النسخة الحالية 2D Canvas).
- فرض Landscape عبر `screen.orientation.lock('landscape')` + CSS fallback (rotate تحذيري لو الجهاز portrait).

### 2) شاشة اللوبي الجديدة (مطابقة لصور Granny House)
- خلفية داكنة + عدّاد `X/N` (مثلاً `1/2` أو `1/8`).
- **اختيار عدد اللاعبين قبل الدخول**: 2 / 4 / 6 / 8 (زر تحديد قبل ما يضغط "ابحث عن لعبة").
- شخصية Chibi في المنتصف بتظهر بأنميشن idle (شعر أسود + فيونكة حمراء + أجنحة صغيرة + جاكيت أحمر).
- زر "Start Game" ذهبي فوق يظهر لما يكتمل العدد الحقيقي.
- قائمة اللاعبين على الشمال (Lv + username).
- زر خروج + زر إعدادات في الزاوية.

### 3) Matchmaking Realtime
- إعادة استخدام جدول `wc_pvp_matches` مع إضافة عمود `player_cap` (2/4/6/8).
- Supabase Realtime Presence channel لكل غرفة.
- أول لاعب = host؛ لما يوصل العدد المطلوب يقدر يضغط Start.
- خصم 50 كريدت عند بداية المباراة (RPC موجود `wc_pay_entry`).

### 4) بيئة الملعب 3D (Stadium Scene)
- ملعب مستطيل + مرميين + خطوط بيضاء + كورة كروية في المنتصف.
- جدران محيطة + جماهير Chibi مسطحة (billboards) حوالين الملعب.
- إضاءة: `AmbientLight` خافت + `DirectionalLight` قوي من فوق (كشافات ملعب) + ظلال حقيقية (`castShadow` / `receiveShadow`).
- انتقال دراماتيكي من اللوبي للملعب (fade + دوران كاميرا 360° لمدة 2 ثانية).

### 5) شخصية Chibi 3D (بدون مكعبات)
- تركيبة primitives ناعمة:
  - رأس: `SphereGeometry` (كبير)
  - جسم: `CapsuleGeometry` (جاكيت أحمر)
  - أرجل × 2: `CylinderGeometry`
  - أيدي × 2: `CylinderGeometry`
  - فيونكة حمراء فوق الرأس: `TorusGeometry` صغير
  - أجنحة × 2: `ConeGeometry` مسطح على الظهر
  - عيون: دائرتين سود على الوجه (`SphereGeometry` صغيرة)
- كل حاجة `flatShading: false` علشان تبان ناعمة كرتونية.
- اسم اللاعب + مستواه فوق راسه (billboard text).

### 6) الأنميشن (AnimationMixer يدوي)
- بما إننا مش هنستخدم GLB جاهز، هنعمل rig يدوي:
  - **Idle**: تنفس بسيط (scale + bob رأسي).
  - **Run**: تأرجح الأرجل والأيدي (rotation.x sinusoidal).
  - **Jump**: قفزة رأسية + انثناء رجلين.
  - **Kick**: رجل يمين تتحرك للأمام بسرعة.
  - **Stunned**: الشخصية تتمايل + سرعة مشي × 0.3 لمدة 5 ثواني.

### 7) نظام التحكم الصارم
- **جويستيك ثابت** في الزاوية السفلية اليسرى (SVG مرئي، مش عائم/وهمي) — يدعم 360°.
- **الكاميرا مستقلة تماماً عن حركة اللاعب**:
  - Third-person orbit ثابتة الزاوية ما تلفش تلقائي.
  - سحب في أي مساحة فارغة (يمين الشاشة أو فوق) → يلف الكاميرا حول الشخصية.
  - يشتغل في نفس اللحظة مع الجويستيك (multi-touch).
- **أزرار الأكشن أسفل اليمين** (مطابقة للصور):
  - JUMP (أيقونة قفز)
  - THROW STONE (عداد 3 رميات، تختفي بعد نفاد)
  - SHOOT ⚽ (زر كبير لركل الكرة — لو قريب من الكرة تطبق Impulse Force)

### 8) فيزياء الكرة وقواعد اللعبة
- الكرة sphere مع velocity vector.
- Update loop كل frame: position += velocity؛ يخبط الحوائط يرتد؛ احتكاك 0.98.
- التصادم مع اللاعبين: لو قريب + ضغط SHOOT → impulse قوي في اتجاه اللاعب.
- **الأهداف**: لما الكرة تعدي خط المرمى → صوت "GOOOOL" + عداد الفريق يزيد + الكرة ترجع للمنتصف.
- **الفرق**: تقسيم تلقائي أحمر vs أزرق (نص اللاعبين).
- **المؤقت**: 5 دقائق. لما ينتهي → أعلى نقاط يفوز → توزيع الكريدت (RPC `wc_finish_match`) → رجوع للوبي.
- **رمي الحجر**: لو أصاب لاعب → يخليه Stunned 5 ثواني.

### 9) المزامنة السحابية (Zero-lag)
- Supabase Realtime Broadcast لكل غرفة (channel).
- كل لاعب يبعت position/rotation/state كل 50ms (throttled).
- الكرة: **الـ host فقط** بيمشي فيزياء الكرة ويبعت state للباقيين (يمنع divergence).
- Client-side interpolation: `lerp(currentPos, receivedPos, 0.2)` لسلاسة.
- Client-side prediction للاعب المحلي (يتحرك فوراً بدون انتظار السيرفر).

### 10) PWA (تنزيل التطبيق)
- `public/manifest.json` كامل: name, short_name, icons (192, 512), theme_color, display: standalone, start_url.
- تعديل `public/sw.js` الموجود ليعمل offline caching بسيط.
- زر "📥 تنزيل التطبيق" في الصفحة الرئيسية → يستدعي `beforeinstallprompt` event.

### 11) تحسينات UI جانبية
- تصغير `LanguageSwitcher` ونقله للزاوية العلوية القصوى (16×16px icon فقط).

---

## المرحلة الثانية (بعد اختبار المرحلة الأولى)

- Texture mapping حقيقي للوجه بدل الدوائر (SVG texture).
- شخصيات متعددة (4 skins مختلفة).
- Sound effects: صافرة، جماهير، ركل، هدف.
- Replay + Kill cam.
- Leaderboard عالمي.

---

## ملاحظات تقنية

- **Three.js في TanStack Start**: R3F يحتاج `<ClientOnly>` لأنه يستخدم WebGL — هيتلف كامل الـ `world-cup.play.tsx` في `<ClientOnly>`.
- **60 FPS**: `useFrame` من R3F + `Suspense` للـ preloading.
- **Mobile performance**: هنستخدم `dpr={[1, 1.5]}` لتقليل الضغط على GPU.
- **Migration واحدة**: إضافة `player_cap` لجدول `wc_pvp_matches`.
- الجدول الحالي `wc_pvp_matches` وRPCs موجودة — هنستفيد منها.

---

## هل توافق على البدء بالمرحلة الأولى بالكامل؟

الشغل ده كبير جداً (~2000 سطر كود جديد) وممكن ياخد وقت في التنفيذ، بس هيطلع بجودة عالية ومتزامن أونلاين حقيقي. لو موافق قول **"ابدأ"** وهبدأ فوراً.
