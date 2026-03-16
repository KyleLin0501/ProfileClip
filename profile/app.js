const input = document.getElementById("input");
const decodeBtn = document.getElementById("decode");
const statusEl = document.getElementById("status");
const profileEl = document.getElementById("profile");
const copyBtn = document.getElementById("copy-json");

let lastJSON = null;
let debounceTimer = null;

const TYPE_META = {
    header: { label: "簡介", color: "#4C8BF5", icon: "👤" },
    education: { label: "Education", color: "#5B73FF", icon: "🎓" },
    experience: { label: "Experience", color: "#38B26C", icon: "💼" },
    achievement: { label: "Achievement", color: "#FF9E57", icon: "✨" },
    socialLink: { label: "Social", color: "#FF6FA1", icon: "🔗" },
};

function setStatus(text) {
    statusEl.textContent = text || "";
}

function base64UrlToBytes(str) {
    let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) base64 += "=";
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

function decodePayload(payload) {
    const compressed = base64UrlToBytes(payload);
    let inflated;
    try {
        inflated = window.pako.inflate(compressed); // zlib header
    } catch {
        inflated = window.pako.inflateRaw(compressed); // raw deflate
    }
    const jsonText = new TextDecoder().decode(inflated);
    return JSON.parse(jsonText);
}


function getPayloadFromInput(value) {
    if (!value) return null;
    try {
        const maybeUrl = new URL(value);
        return maybeUrl.searchParams.get("d");
    } catch {
        return value;
    }
}

function renderBlock(block) {
    const meta = TYPE_META[block.type] || { label: block.type, color: "#999", icon: "•" };
    const thumb = document.createElement("div");
    thumb.className = "thumb";
    thumb.style.background = meta.color + "22";

    if (block.thumbnailData) {
        const img = document.createElement("img");
        img.src = "data:image/jpeg;base64," + block.thumbnailData;
        thumb.appendChild(img);
    } else {
        thumb.textContent = meta.icon;
    }

    const card = document.createElement("div");
    card.className = "card";
    card.appendChild(thumb);

    const metaBox = document.createElement("div");
    metaBox.className = "meta";

    const title = document.createElement("div");
    title.className = "title";

    const subtitle = document.createElement("div");
    subtitle.className = "subtitle";

    if (block.type === "header") {
        title.textContent = block.title || "";
        subtitle.textContent = block.subtitle || "";
    } else if (block.type === "education") {
        title.textContent = block.school || "";
        subtitle.textContent = block.department || "";
    } else if (block.type === "experience") {
        title.textContent = block.role || "";
        subtitle.textContent = block.organization || "";
    } else if (block.type === "achievement") {
        title.textContent = block.title || "";
        subtitle.textContent = block.description || "";
    } else if (block.type === "socialLink") {
        title.textContent = block.platform || "";
        subtitle.textContent = block.url || "";
    }

    metaBox.appendChild(title);
    if (subtitle.textContent) metaBox.appendChild(subtitle);

    card.appendChild(metaBox);
    return card;
}

function renderProfile(data) {
    profileEl.innerHTML = "";
    if (!data || !data.blocks) {
        setStatus("No blocks found.");
        return;
    }

    const grouped = data.blocks.reduce((acc, block) => {
        acc[block.type] = acc[block.type] || [];
        acc[block.type].push(block);
        return acc;
    }, {});

    Object.keys(grouped).forEach(type => {
        const section = document.createElement("div");
        section.className = "section";

        const title = document.createElement("h2");
        title.textContent = TYPE_META[type]?.label || type;
        title.style.color = TYPE_META[type]?.color || "#555";
        section.appendChild(title);

        const cards = document.createElement("div");
        cards.className = "cards";

        grouped[type].forEach(block => {
            cards.appendChild(renderBlock(block));
        });

        section.appendChild(cards);
        profileEl.appendChild(section);
    });
}

function tryDecode(payload) {
    try {
        const decoded = decodePayload(payload);
        lastJSON = decoded;
        renderProfile(decoded);
        setStatus("Decode success.");
    } catch (err) {
        console.error(err);
        setStatus("Decode failed. Check compression algorithm and payload.");
    }
}

function scheduleDecode(value) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        const payload = getPayloadFromInput(value.trim());
        if (payload) tryDecode(payload);
    }, 200);
}

decodeBtn.addEventListener("click", () => {
    const payload = getPayloadFromInput(input.value.trim());
    if (!payload) {
        setStatus("Please paste URL or payload.");
        return;
    }
    tryDecode(payload);
});

input.addEventListener("input", () => {
    scheduleDecode(input.value);
});

input.addEventListener("paste", () => {
    setTimeout(() => scheduleDecode(input.value), 50);
});

copyBtn.addEventListener("click", async () => {
    if (!lastJSON) return;
    await navigator.clipboard.writeText(JSON.stringify(lastJSON, null, 2));
    setStatus("JSON copied.");
});

const params = new URL(window.location.href).searchParams;
const payload = params.get("d");
if (payload) {
    input.value = window.location.href;
    tryDecode(payload);
}
