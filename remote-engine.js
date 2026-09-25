// ==========================================
// 🚀 المحرك الخارجي لإضافة Motobox
// هذا الكود يتم تحديثه من السيرفر مباشرة
// ==========================================

const excludedIdentifiers = ["تعويض", "0945555128"];

function highlightAndCheckDuplicates() {
  const currentUrl = window.location.href.toLowerCase();
  const targetPageUrl = "app.motoboxapp.com/public/admin/live-orders";

  if (!currentUrl.includes(targetPageUrl)) return;

  const orders = getOrdersFromCards();
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
          orderCount: 0,
          codes: []
        };
      }
      customerToOrdersMap[customerKey].orderCount += 1;
      customerToOrdersMap[customerKey].codes.push(order.code);
    }
  });

  for (const [customerKey, data] of Object.entries(customerToOrdersMap)) {
    if (data.orderCount > 1) {
      const sortedCodes = [...data.codes].sort().join("_");
      const orderFingerprint = `${customerKey}___count_${data.orderCount}___${sortedCodes}`;
      handleNotificationLifecycle(data.phone, data.name, orderFingerprint);
    }
  }
}

function handleNotificationLifecycle(phone, name, fingerprint) {
  const storageKey = `notified_perm_${fingerprint}`;
  const DURATION = 60000; // دقيقة كاملة

  if (localStorage.getItem(storageKey)) return;

  localStorage.setItem(storageKey, Date.now());
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
titleDiv.textContent = `⚠️ تنبيه: تم اكتشاف طلب مكرر للعميل ${name} (${phone})`;  const subDiv = document.createElement("div");
  subDiv.style.cssText = "font-size: 11px; opacity: 0.9; font-weight: normal; text-align: center;";
  subDiv.textContent = `سيختفي هذا التنبيه بعد 60 ثانية`;

  const textContainer = document.createElement("div");
  textContainer.style.cssText = "flex: 1; text-align: center;";
  textContainer.appendChild(titleDiv);
  textContainer.appendChild(subDiv);

  const refreshBtn = document.createElement("span");
  refreshBtn.textContent = "🔄";
  refreshBtn.title = "تحديث وإعادة الفحص";
  refreshBtn.style.cssText = "cursor: pointer; font-size: 16px; padding: 0 4px; opacity: 0.9;";
  refreshBtn.onclick = () => {
    localStorage.removeItem(`notified_perm_${fingerprint}`);
    removeToast(toast);
    highlightAndCheckDuplicates();
  };

  const closeBtn = document.createElement("span");
  closeBtn.textContent = "✕";
  closeBtn.style.cssText = "cursor: pointer; font-size: 18px; font-weight: bold; padding: 0 5px; opacity: 0.8;";
  closeBtn.onclick = () => removeToast(toast);

  const actionContainer = document.createElement("div");
  actionContainer.style.cssText = "display: flex; align-items: center; gap: 8px;";
  actionContainer.appendChild(refreshBtn);
  actionContainer.appendChild(closeBtn);

  const innerLayout = document.createElement("div");
  innerLayout.style.cssText = "display: flex; align-items: center; justify-content: space-between; gap: 15px; width: 100%;";
  innerLayout.appendChild(textContainer);
  innerLayout.appendChild(actionContainer);

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

  playHarmonicDoubleBeep();

  const soundInterval = setInterval(() => {
    if (document.getElementById(toastId)) {
      playHarmonicDoubleBeep();
    } else {
      clearInterval(soundInterval);
    }
  }, 15000);

  setTimeout(() => {
    clearInterval(soundInterval);
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

function getOrdersFromCards() {
  const orders = [];
  const cardElements = document.querySelectorAll('div[class*="card"], div[class*="item"], div[class*="order"]');

  cardElements.forEach((el) => {
    const text = el.innerText || "";
    if (text.includes('#') && (text.includes('SYP') || text.includes('COD') || text.includes('WALLET'))) {
      const phoneMatch = text.match(/(?:\+|00)?\d{8,15}/);
      const codeMatch = text.match(/#[A-Za-z0-9-]+/i);

      if (phoneMatch && codeMatch) {
        const cleanPhone = phoneMatch[0].replace(/[\s-]/g, '');
        const code = codeMatch[0];
        let customerName = "عميل";
        const lines = text.split('\n');

        for (let line of lines) {
          if (line.includes('-') && line.includes(cleanPhone.slice(-6))) {
            const parts = line.split('-');
            for (let part of parts) {
              const cleanPart = part.trim();
              if (!cleanPart.match(/\d{6,}/) && cleanPart.length > 1) {
                customerName = cleanPart;
                break;
              }
            }
            break;
          }
        }
        orders.push({ phone: cleanPhone, name: customerName, code: code });
      }
    }
  });

  return orders;
}

highlightAndCheckDuplicates();
setInterval(highlightAndCheckDuplicates, 3000);
