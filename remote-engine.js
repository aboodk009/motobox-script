// 📝 قائمة الاستثناءات: حساب تعويض والرقم المخصص
const excludedIdentifiers = ["تعويض", "0945555128"];

function highlightAndCheckDuplicates() {
  const currentUrl = window.location.href.toLowerCase();
  const targetPageUrl = "app.motoboxapp.com/public/admin/live-orders";

  if (!currentUrl.includes(targetPageUrl)) return;

  const orders = getOrdersFromCards();

  console.log(`📦 إجمالي الطلبات المكتشفة في الصفحة: ${orders.length}`, orders);

  const customerToOrdersMap = {};

  orders.forEach(order => {
    const isExcluded = excludedIdentifiers.some(id => 
      order.phone.includes(id) || order.name.includes(id)
    );

    if (!isExcluded) {
      const customerKey = `${order.name}___${order.phone}`;
      
      if (!customerToOrdersMap[customerKey]) {
        customerToOrdersMap[customerKey] = {
          phone: order.phone,
          name: order.name,
          codes: []
        };
      }

      customerToOrdersMap[customerKey].codes.push(order.code);
    }
  });

  for (const [customerKey, data] of Object.entries(customerToOrdersMap)) {
    if (data.codes.length > 1) {
      console.log(`⚠️ تم كشف طلب مكرر للعميل: ${data.name} (${data.phone}) - الأكواد:`, data.codes);

      const sortedCodes = [...data.codes].sort().join("_");
      const orderFingerprint = `${customerKey}___${sortedCodes}`;

      handleNotificationLifecycle(data.phone, data.name, orderFingerprint);
    }
  }
}

function handleNotificationLifecycle(phone, name, fingerprint) {
  const storageKey = `notified_perm_${fingerprint}`;
  const DURATION = 30000;
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

  const savedTime = localStorage.getItem(storageKey);

  if (savedTime) {
    if (Date.now() - parseInt(savedTime, 10) > TWENTY_FOUR_HOURS) {
      localStorage.removeItem(storageKey);
    } else {
      return; 
    }
  }

  localStorage.setItem(storageKey, Date.now());
  playHarmonicDoubleBeep();
  showInPageToast(phone, name, fingerprint, DURATION);
}

function playHarmonicDoubleBeep() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (ctx.state === 'suspended') ctx.resume();

    const playTone = (freq, startTime, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime + startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + startTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + startTime);
      osc.stop(ctx.currentTime + startTime + duration);
    };

    playTone(850, 0, 0.18);
    playTone(1050, 0.3, 0.22);
  } catch (e) {
    console.warn("تعذر تشغيل الصوت:", e);
  }
}

function showInPageToast(phone, name, fingerprint, duration) {
  const toastId = `toast-duplicate-${fingerprint}`;
  if (document.getElementById(toastId)) return;

  const toast = document.createElement("div");
  toast.id = toastId;
  toast.classList.add('duplicate-toast');
  
  const titleDiv = document.createElement("div");
  titleDiv.style.cssText = "font-size: 15px; font-weight: bold; margin-bottom: 4px; text-align: center;";
  titleDiv.textContent = `⚠️ تنبيه: تم اكتشاف طلب مكرر للعميل ${name} (${phone})`;

  const subDiv = document.createElement("div");
  subDiv.style.cssText = "font-size: 11px; opacity: 0.9; font-weight: normal; text-align: center;";
  subDiv.textContent = `سيختفي هذا التنبيه بعد 30 ثانية`;

  const textContainer = document.createElement("div");
  textContainer.style.cssText = "flex: 1; text-align: center;";
  textContainer.appendChild(titleDiv);
  textContainer.appendChild(subDiv);

  const closeBtn = document.createElement("span");
  closeBtn.textContent = "✕";
  closeBtn.style.cssText = "cursor: pointer; font-size: 18px; font-weight: bold; padding: 0 5px; opacity: 0.8;";
  closeBtn.onclick = () => removeToast(toast);

  const innerLayout = document.createElement("div");
  innerLayout.style.cssText = "display: flex; align-items: center; justify-content: space-between; gap: 15px; width: 100%;";
  innerLayout.appendChild(textContainer);
  innerLayout.appendChild(closeBtn);

  toast.appendChild(innerLayout);

  toast.style.cssText = `
    position: fixed; left: 50%; transform: translateX(-50%);
    background-color: #d9534f; color: white; padding: 12px 22px;
    border-radius: 8px; box-shadow: 0 6px 16px rgba(0,0,0,0.25);
    z-index: 999999; direction: rtl; text-align: center; min-width: 340px;
    transition: all 0.3s ease;
  `;

  document.body.appendChild(toast);
  repositionToasts();

  setTimeout(() => {
    if (document.getElementById(toastId)) removeToast(toast);
  }, duration);
}

function removeToast(toastElement) {
  toastElement.style.opacity = "0";
  setTimeout(() => {
    if (toastElement.parentNode) {
      toastElement.remove();
      repositionToasts();
    }
  }, 300);
}

function repositionToasts() {
  const toasts = document.querySelectorAll('.duplicate-toast');
  toasts.forEach((toast, index) => {
    toast.style.top = `${20 + (index * 75)}px`;
  });
}

// 🎯 دالة القراءة المضمونة 100% المستندة إلى نص الصورة
function getOrdersFromCards() {
  const orders = [];
  // البحث في كل العناصر ذات الحجم الصغير والمتوسط
  const elements = document.querySelectorAll('div, li, section');

  elements.forEach((el) => {
    // التأكد من أن العنصر بطاقة منفردة وليس الحاوية الكاملة
    if (el.children.length < 10 && el.children.length > 0) {
      const text = el.innerText || "";

      // الشرط: وجود رمز # وبدء رقم الهاتف بـ 963 أو 09 أو وجود +
      if (text.includes('#') && (text.includes('963') || text.includes('09') || text.includes('+'))) {
        const codeMatch = text.match(/#[A-Za-z0-9]+/i);
        const phoneMatch = text.match(/(?:\+|00)?963\d{8,10}|09\d{8}/);

        if (codeMatch && phoneMatch) {
          const code = codeMatch[0];
          const cleanPhone = phoneMatch[0].replace(/[\s-]/g, '');

          let customerName = "عميل";
          const lines = text.split('\n');

          for (let line of lines) {
            if (line.includes('-')) {
              const parts = line.split('-');
              const possibleName = parts[0].trim();
              if (possibleName && !possibleName.startsWith('#')) {
                customerName = possibleName;
                break;
              }
            }
          }

          if (!orders.some(o => o.code === code)) {
            orders.push({ phone: cleanPhone, name: customerName, code: code });
          }
        }
      }
    }
  });

  return orders;
}

highlightAndCheckDuplicates();
setInterval(highlightAndCheckDuplicates, 3000);
