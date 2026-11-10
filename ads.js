import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCFpSNTqw9ljOFkxA-szNcNi-HmVKZU-7I",
  authDomain: "binsoud-habari-8a5fa.firebaseapp.com",
  projectId: "binsoud-habari-8a5fa",
  storageBucket: "binsoud-habari-8a5fa.firebasestorage.app",
  messagingSenderId: "865091074307",
  appId: "1:865091074307:web:27b26aa8f0f3476ef45136",
  measurementId: "G-MH266J0XKE"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, ch => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[ch]));

function safeUrl(value) {
  const valueText = String(value || "").trim();
  if (/^https?:\/\//i.test(valueText)) return valueText;
  if (/^(images|uploads)\//i.test(valueText)) return valueText;
  return "";
}

function getYouTubeId(value) {
  try {
    const url = new URL(value);
    if (url.hostname.includes("youtu.be")) return url.pathname.slice(1).split("/")[0];
    if (url.hostname.includes("youtube.com")) {
      if (url.pathname === "/watch") return url.searchParams.get("v");
      const match = url.pathname.match(/\/(embed|shorts)\/([^/?]+)/);
      return match ? match[2] : "";
    }
  } catch (_) {}
  return "";
}

function asDate(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isCurrentlyActive(ad) {
  if (ad.active !== true) return false;
  const now = new Date();
  const start = asDate(ad.startDate || ad.startAt);
  const end = asDate(ad.endDate || ad.endAt);
  if (start && now < start) return false;
  if (end && now > end) return false;
  return true;
}

function placementOf(ad) {
  const raw = String(ad.placement || ad.position || ad.slot || "top").toLowerCase().trim();
  const aliases = {
    header: "top", top_banner: "top", topbanner: "top",
    footer: "bottom", bottom_banner: "bottom", bottombanner: "bottom",
    side: "sidebar", side_bar: "sidebar", sponsored_article: "sponsored",
    article: "sponsored"
  };
  return aliases[raw] || raw;
}

function mediaMarkup(ad, label) {
  const image = safeUrl(ad.imageUrl || ad.imageURL || ad.image || "");
  const video = safeUrl(ad.videoUrl || ad.videoURL || ad.video || "");
  const link = safeUrl(ad.linkUrl || ad.linkURL || ad.link || "");
  const type = String(ad.mediaType || ad.type || "").toLowerCase();
  const useVideo = Boolean(video) && (type === "video" || type === "youtube" || !image);
  let media = "";

  if (useVideo) {
    const youtubeId = getYouTubeId(video);
    media = youtubeId
      ? `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeId)}" title="${escapeHtml(ad.title || label)}" loading="lazy" allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`
      : `<video controls playsinline preload="metadata"><source src="${escapeHtml(video)}"></video>`;
  } else if (image) {
    media = `<img src="${escapeHtml(image)}" alt="${escapeHtml(ad.title || label)}" loading="lazy" decoding="async">`;
  }

  if (!media) return "";
  const linked = link && !useVideo ? `<a class="bh-ad-click" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">${media}</a>` : media;
  const title = ad.title ? `<div class="bh-ad-caption">${escapeHtml(ad.title)}</div>` : "";
  return `${linked}${title}`;
}

function renderSlot(element, ads, placement, label) {
  if (!element) return;
  const ad = ads.find(item => placementOf(item) === placement);
  if (!ad) {
    element.hidden = true;
    return;
  }
  const content = mediaMarkup(ad, label);
  if (!content) {
    element.hidden = true;
    return;
  }
  element.innerHTML = `<div class="bh-ad-label">${label}</div>${content}`;
  element.hidden = false;
}

function renderSponsored(element, ads) {
  if (!element) return;
  const ad = ads.find(item => placementOf(item) === "sponsored");
  if (!ad) {
    element.hidden = true;
    return;
  }
  const image = safeUrl(ad.imageUrl || ad.imageURL || ad.image || "");
  const link = safeUrl(ad.articleUrl || ad.linkUrl || ad.link || "");
  const title = String(ad.articleTitle || ad.title || "Makala ya Udhamini");
  const description = String(ad.description || ad.summary || "");
  if (!title || (!description && !image)) {
    element.hidden = true;
    return;
  }
  const imageHtml = image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" loading="lazy">` : "";
  const titleHtml = link
    ? `<a href="${escapeHtml(link)}" ${/^https?:\/\//i.test(link) ? 'target="_blank" rel="noopener noreferrer"' : ''}>${escapeHtml(title)}</a>`
    : escapeHtml(title);
  element.innerHTML = `<div class="bh-sponsored-label">MAKALA YA UDHAMINI</div><article class="bh-sponsored-card">${imageHtml}<div><h2>${titleHtml}</h2>${description ? `<p>${escapeHtml(description)}</p>` : ""}</div></article>`;
  element.hidden = false;
}

async function loadAdvertisements() {
  try {
    const adsQuery = query(collection(db, "advertisements"), where("active", "==", true));
    const snapshot = await getDocs(adsQuery);
    const ads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(isCurrentlyActive);
    renderSlot(document.querySelector("[data-bh-ad='top']"), ads, "top", "TANGAZO");
    renderSlot(document.querySelector("[data-bh-ad='bottom']"), ads, "bottom", "TANGAZO");
    renderSlot(document.querySelector("[data-bh-ad='sidebar']"), ads, "sidebar", "TANGAZO");
    renderSponsored(document.querySelector("[data-bh-ad='sponsored']"), ads);
  } catch (error) {
    console.error("Matangazo hayakuweza kupakiwa:", error);
  }
}

loadAdvertisements();
