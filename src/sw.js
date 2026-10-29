// Clean Print – servis çalışanı. İkon tıklanınca: sayfayı dondur (snapshot) → editör sekmesini aç.

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !/^https?:|^file:/.test(tab.url || "")) return;
  if (/\.pdf(\?|#|$)/i.test(tab.url || "")) { // Chrome'un PDF görüntüleyicisi script kabul etmez; rozetle uyar
    await flashBadge(tab.id, "PDF", "This tab shows a PDF. PDFs are already print-ready: press Ctrl+P here. Clean Print works on web pages.");
    return;
  }
  try {
    const [{ result }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["vendor/Readability.js", "snapshot.js"] });
    if (!result || result.error) {
      const msgs = {
        pdf: "This tab shows a PDF. PDFs are already print-ready: press Ctrl+P (⌘P) here to print or save it. Clean Print works on web pages.",
        empty: "Clean Print could not find any printable content on this page (it may be an app, a video page or a page that is still loading).",
      };
      throw new Error(msgs[result?.error] || result?.error || "snapshot failed");
    }
    const key = "snap:" + crypto.randomUUID();
    await chrome.storage.session.set({ [key]: result });
    await chrome.tabs.create({ url: chrome.runtime.getURL("editor/editor.html") + "#" + key, index: tab.index + 1 });
  } catch (e) {
    console.error("Clean Print:", e);
    const msg = "Clean Print could not capture this page: " + String(e.message || e);
    try { await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: (m) => alert(m), args: [msg] }); }
    catch { await flashBadge(tab.id, "!", msg); }
  }
});

async function flashBadge(tabId, text, title) {
  try {
    await chrome.action.setBadgeBackgroundColor({ tabId, color: "#b91c1c" });
    await chrome.action.setBadgeText({ tabId, text });
    await chrome.action.setTitle({ tabId, title });
    setTimeout(() => { chrome.action.setBadgeText({ tabId, text: "" }).catch(() => {}); chrome.action.setTitle({ tabId, title: "Clean Print: edit this page for printing" }).catch(() => {}); }, 6000);
  } catch { /* sekme kapanmış olabilir */ }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "getSnapshot") {
    chrome.storage.session.get(msg.key).then((d) => sendResponse(d[msg.key] || null));
    return true;
  }
});
