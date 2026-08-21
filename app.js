/* 3일차 활동지 — 입력 보존 · 진행 표시 · 문단 초안 조립 · 인쇄 */
(function () {
  "use strict";

  /* 1·2일차와 다른 네임스페이스. 같은 브라우저에서 세 활동지를 동시에 열어도
     서로의 값을 덮어쓰지 않는다. */
  var NS = "gdb-day3:v1:";
  var LIMIT = 400;

  var store = (function () {
    try {
      var t = "__t";
      localStorage.setItem(t, t);
      localStorage.removeItem(t);
      return localStorage;
    } catch (e) {
      return null;
    }
  })();

  function keyFor(el) {
    if (el.dataset.k) return el.dataset.k;
    var path = [], node = el, root = null;
    while (node && node !== document.body) {
      if (node.id) { root = node.id; break; }
      var p = node.parentNode;
      if (!p) break;
      path.push(Array.prototype.indexOf.call(p.children, node));
      node = p;
    }
    var k = (root || "doc") + "/" + path.reverse().join(".");
    el.dataset.k = k;
    return k;
  }

  var SEL = "input[type=text], input[type=url], input[type=checkbox], input[type=radio], textarea, select";
  var fields = [];

  function isField(el) {
    return !!(el && el.matches && el.matches(SEL));
  }

  function collect() {
    fields = Array.prototype.slice.call(document.querySelectorAll(SEL));
    fields.forEach(keyFor);
  }

  function restore() {
    if (!store) return;
    fields.forEach(function (el) {
      var v = store.getItem(NS + el.dataset.k);
      if (v === null) return;
      if (el.type === "checkbox" || el.type === "radio") el.checked = v === "1";
      else el.value = v;
    });
  }

  var flag = document.getElementById("saved");
  var flagTimer = null, saveTimer = null, maxWaitTimer = null, queue = new Set();

  function flash() {
    if (!flag) return;
    flag.classList.add("on");
    clearTimeout(flagTimer);
    flagTimer = setTimeout(function () { flag.classList.remove("on"); }, 1400);
  }

  function commit() {
    if (!store) return;
    queue.forEach(function (el) {
      var k = NS + el.dataset.k;
      if (el.type === "checkbox" || el.type === "radio") {
        if (el.checked) store.setItem(k, "1");
        else store.removeItem(k);
      } else {
        var v = el.value;
        if (v === "") store.removeItem(k);
        else store.setItem(k, v);
      }
    });
    queue.clear();
    clearTimeout(maxWaitTimer);
    maxWaitTimer = null;
    flash();
  }

  /* 디바운스 400ms. 쉬지 않고 입력하면 커밋이 끝없이 밀리므로 3초 상한을 둔다. */
  function scheduleSave(el) {
    queue.add(el);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(commit, 400);
    if (!maxWaitTimer) {
      maxWaitTimer = setTimeout(function () {
        maxWaitTimer = null;
        clearTimeout(saveTimer);
        commit();
      }, 3000);
    }
  }

  /* 라디오는 새로 켜진 쪽만 change가 오고, 꺼진 쪽은 오지 않는다.
     그대로 두면 저장소에 "1"이 둘 남아 다음 방문에 두 칸이 다 켜진 것으로
     복원되므로, 같은 그룹의 다른 칸을 직접 지운다. */
  function clearRadioSiblings(el) {
    if (el.type !== "radio" || !el.name) return;
    document.querySelectorAll('input[type=radio][name="' + el.name + '"]').forEach(function (o) {
      if (o !== el) queue.add(o);
    });
  }

  function grow(el) {
    if (!el || el.tagName !== "TEXTAREA") return;
    el.style.height = "auto";
    var min = parseFloat(getComputedStyle(el).minHeight) || 0;
    el.style.height = Math.max(el.scrollHeight, min) + "px";
  }

  /* ── 진행: data-progress 체크만 집계 ── */
  var parts = Array.prototype.slice.call(document.querySelectorAll("[data-part]"));
  function tally() {
    parts.forEach(function (sec) {
      var boxes = sec.querySelectorAll("input[type=checkbox][data-progress]");
      var done = 0;
      boxes.forEach(function (b) { if (b.checked) done++; });
      var bar = document.querySelector('.rail__bar[data-for="' + sec.id + '"] i');
      if (bar) bar.style.width = boxes.length ? (done / boxes.length) * 100 + "%" : "0%";
    });
  }

  function spy() {
    if (!("IntersectionObserver" in window)) return;
    var items = {};
    document.querySelectorAll(".rail__item").forEach(function (li) { items[li.dataset.for] = li; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var li = items[e.target.id];
        if (li) li.classList.toggle("is-here", e.isIntersecting);
      });
    }, { rootMargin: "-84px 0px -62% 0px" });
    parts.forEach(function (p) { io.observe(p); });
  }

  /* ── 세 문단 글자 수 (400자 상한) ── */
  var COUNTED = [
    { ta: "sum-para", out: "sum-count" },
    { ta: "cm-para", out: "cm-count" },
    { ta: "diff-para", out: "diff-count" }
  ];

  function updateCount(taId) {
    COUNTED.forEach(function (pair) {
      if (taId && pair.ta !== taId) return;
      var ta = document.getElementById(pair.ta);
      var out = document.getElementById(pair.out);
      if (!ta || !out) return;
      var n = ta.value.length;
      out.textContent = n.toLocaleString("ko-KR") + "자";
      var over = n > LIMIT;
      out.classList.toggle("is-over", over);
      /* 막지는 않는다. 넘겨 쓰고 줄이는 편이 자연스럽다. */
      out.title = over ? LIMIT + "자를 " + (n - LIMIT) + "자 넘었습니다" : "";
    });
  }

  /* ── 문단 초안 조립 ── */
  function val(id) {
    var el = document.getElementById(id);
    return el ? (el.value || "").trim() : "";
  }

  function fill(taId, text, msgId, msg) {
    var ta = document.getElementById(taId);
    var out = document.getElementById(msgId);
    if (!ta) return;
    if (!text) {
      if (out) out.textContent = "먼저 위 칸을 채워 주세요.";
      return;
    }
    /* 손으로 고쳐 둔 문단을 말없이 날리지 않는다. */
    if (ta.value.trim() && !confirm("이 문단에 적어 두신 내용을 지우고 다시 채웁니다. 계속할까요?")) return;
    ta.value = text;
    grow(ta);
    updateCount(taId);
    scheduleSave(ta);
    if (out) out.textContent = msg;
  }

  var sumBtn = document.getElementById("btn-build-sum");
  if (sumBtn) sumBtn.addEventListener("click", function () {
    var a = val("sum-a"), b = val("sum-b"), c = val("sum-c");
    var parts2 = [];
    if (a) parts2.push(a.replace(/[.·]$/, "") + ".");
    if (b) parts2.push(b.replace(/[.·]$/, "") + ".");
    if (c) parts2.push(c.replace(/[.·]$/, "") + ".");
    fill("sum-para", parts2.join(" "), "sum-msg", "이었습니다. 문장을 자연스럽게 손보세요.");
  });

  var CM = {
    "cm/1": "두 글은 같은 하루를 다룬다 — 봄, 남해, 학교 앞 분식집, 김치찌개 한 그릇",
    "cm/2": "사건의 순서가 같다 — 떠남, 밥집 찾기, 두 사람, 주문, 다툼, 다 먹음, 벽에 적기",
    "cm/3": "마지막에 벽에 적는 문장이 글자까지 같다",
    "cm/4": "화자가 끼어들지 않는다 — 말리지도 편들지도 않고 지켜보기만 한다",
    "cm/5": "감상을 문장으로 말하지 않는다 — 「뭉클했다」 같은 말이 두 글 다 없다",
    "cm/6": "계절이 사람의 몸에 얹힌다 — 봄과 겨울이 여자의 몸으로 나뉜다"
  };

  var cmBtn = document.getElementById("btn-build-cm");
  if (cmBtn) cmBtn.addEventListener("click", function () {
    var picked = [];
    Object.keys(CM).forEach(function (k) {
      var box = document.querySelector('[data-k="' + k + '"]');
      if (box && box.checked) picked.push(CM[k]);
    });
    if (picked.length > 3) {
      alert("여섯 개를 다 고르면 문단이 나열이 됩니다. 두세 개만 남기고 다시 눌러 보세요.");
      return;
    }
    fill("cm-para", picked.join(". ") + (picked.length ? "." : ""), "cm-msg",
      picked.length + "개를 이었습니다. 왜 그것이 공통점인지 한 문장을 덧붙이세요.");
  });

  var DIFF_ROWS = [
    { name: "여자의 몸", p: "d1p", s: "d1s" },
    { name: "가는 길", p: "d2p", s: "d2s" },
    { name: "말투와 부호", p: "d3p", s: "d3s" },
    { name: "끝나는 자리", p: "d4p", s: "d4s" }
  ];

  /* 「몸을」/「말투를」처럼 받침에 따라 조사가 갈린다.
     을(를)로 흘려 두면 손으로 다시 고쳐야 하므로 종성을 보고 고른다. */
  function objectParticle(word) {
    var last = word.charCodeAt(word.length - 1);
    if (last < 0xac00 || last > 0xd7a3) return "를";
    return (last - 0xac00) % 28 ? "을" : "를";
  }

  function period(s) {
    return /[.!?」』]$/.test(s) ? s : s + ".";
  }

  var diffBtn = document.getElementById("btn-build-diff");
  if (diffBtn) diffBtn.addEventListener("click", function () {
    var lines = [];
    DIFF_ROWS.forEach(function (r) {
      var pv = val(r.p), sv = val(r.s);
      if (!pv && !sv) return;
      lines.push(
        r.name + objectParticle(r.name) + " 보면, 「알맞은 시절」은 " + period(pv || "( )") +
        " 「낙서」는 " + period(sv || "( )")
      );
    });
    fill("diff-para", lines.join(" "), "diff-msg",
      lines.length + "개를 이었습니다. 문장이 끊기니 이어 주는 말을 넣어 손보세요.");
  });

  /* ── 챗봇 메모 ── */
  function pickedRadio(names, labels) {
    for (var i = 0; i < names.length; i++) {
      var el = document.querySelector('[data-k="' + names[i] + '"]');
      if (el && el.checked) return labels[i];
    }
    return "(고르지 않음)";
  }

  /* 도구는 여러 개 고를 수 있다 — 초고와 편집을 나눠 쓰는 경우가 흔하다. */
  function tools() {
    var names = { "kk/8-a": "자작자작", "kk/8-b": "캔바", "kk/8-c": "구글 독스" };
    var picked = [];
    Object.keys(names).forEach(function (k) {
      var box = document.querySelector('[data-k="' + k + '"]');
      if (box && box.checked) picked.push(names[k]);
    });
    var etc = val("k8");
    if (etc) picked.push(etc);
    return picked.length ? picked.join(" · ") : "(아직 못 정함)";
  }

  /* 칸 2-C에서 고른 취향 — 챗봇이 이 사람 눈으로 캐묻게 하려면 함께 넘겨야 한다. */
  function taste() {
    var names = ["사람 얼굴과 표정", "오래된 물건", "글자 · 간판 · 손글씨", "소리", "먹는 것",
                 "만듦새 · 구조", "식물과 동물", "빛과 그림자", "값 · 숫자", "냄새", "사람 없는 시간"];
    var picked = [];
    names.forEach(function (n, i) {
      var box = document.querySelector('[data-k="taste/' + (i + 1) + '"]');
      if (box && box.checked) picked.push(n);
    });
    var etc2 = val("taste-etc");
    if (etc2) picked.push(etc2);
    return picked.join(" · ");
  }

  function buildMemo() {
    var thick = pickedRadio(["kk/4-a", "kk/4-b", "kk/4-c"], ["여정", "견문", "감상"]);
    var how = pickedRadio(["kk/5-a", "kk/5-b", "kk/5-c"], ["짧게 쓰기", "길게 쓰기", "다른 눈으로"]);
    var form = pickedRadio(["kk/6-a", "kk/6-b", "kk/6-c"], ["포토시", "포토에세이", "사진 여럿 + 짧은 말"]);
    var lines = [
      "저는 문화탐방기행집에 실을 글 한 편을 설계하는 중입니다. 아래는 제가 이미 정한 것입니다.",
      "정해 둔 것을 바꾸지 말고, 빈 곳을 캐물어 주세요.",
      "",
      "글 제목(임시) : " + (val("k1") || "(아직 못 정함)"),
      "탐방지 : " + (val("trip-where") || "(아직 안 적음)"),
      "자세히 볼 것 : " + (val("k2") || "(아직 못 정함)"),
      "왜 하필 내가 : " + (val("k3") || "(아직 못 정함)"),
      "두껍게 쓸 것 : " + thick,
      "어떻게 씁니까 : " + how,
      "형식 : " + form + " (사진은 기본으로 들어갑니다)",
      "쪽수·사진 수 : " + (val("k6") || "(아직 못 정함)"),
      "이 글이 맡는 부분 : " + (val("k7") || "(아직 못 적음)"),
      "쓸 도구 : " + tools()
    ];
    var eyes = taste();
    if (eyes) lines.push("내가 원래 눈이 가는 것 : " + eyes);
    var skip = val("gaze2");
    if (skip) lines.push("일부러 안 쓸 것 : " + skip);
    var who = val("pov-who");
    if (who) lines.push("나를 보고 있었을 쪽 : " + who);
    return lines.join("\n");
  }

  var memoArea = document.getElementById("gem-memo");
  var memoMsg = document.getElementById("memo-msg");

  var buildMemoBtn = document.getElementById("btn-build-memo");
  if (buildMemoBtn && memoArea) buildMemoBtn.addEventListener("click", function () {
    if (memoArea.value.trim() &&
        !confirm("메모 칸에 적어 두신 내용을 지우고 다시 채웁니다. 계속할까요?")) return;
    memoArea.value = buildMemo();
    grow(memoArea);
    scheduleSave(memoArea);
    if (memoMsg) memoMsg.textContent = "채웠습니다. 고쳐도 됩니다.";
  });

  function copyText(text, done) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
      return;
    }
    done(false);
  }

  var memoCopyBtn = document.getElementById("btn-copy-memo");
  if (memoCopyBtn && memoArea) memoCopyBtn.addEventListener("click", function () {
    var text = (memoArea.value || "").trim() || buildMemo();
    /* 폴백은 선택 영역을 복사하므로, 칸이 비어 있으면 먼저 채워 넣어야
       빈 문자열을 복사해 놓고 "복사했습니다"라고 하지 않는다. */
    if (!memoArea.value.trim()) {
      memoArea.value = text;
      grow(memoArea);
      scheduleSave(memoArea);
    }
    copyText(text, function (ok) {
      if (ok) { if (memoMsg) memoMsg.textContent = "복사했습니다. 챗봇 첫 칸에 붙여 넣으세요."; return; }
      memoArea.select();
      var done2 = document.execCommand && document.execCommand("copy");
      if (memoMsg) memoMsg.textContent = done2
        ? "복사했습니다. 챗봇 첫 칸에 붙여 넣으세요."
        : "복사가 막혔습니다. 위 칸을 직접 선택해 복사하세요.";
    });
  });

  /* ── 채팅 한 줄 ── */
  function chatLine() {
    /* 「과학 중2」처럼 학년이 붙어 오므로 채팅 규격 [교과·이름]에 맞게 학년만 떼어 낸다. */
    var subject = val("f-subject").split(/[·\/]/)[0].replace(/\s*(초|중|고)\s*\d.*$/, "").trim();
    var who = [subject, val("f-name")].filter(Boolean).join("·");
    var how = pickedRadio(["kk/5-a", "kk/5-b", "kk/5-c"], ["짧게 쓰기", "길게 쓰기", "다른 눈으로"]);
    return "[" + (who || "교과·이름") + "] " +
      (val("k1") || "글 제목") + " | " +
      (val("k2") || "자세히 볼 것") + " | " + how;
  }

  function syncChatLine() {
    var el = document.getElementById("chat-line");
    if (el) el.value = chatLine();
  }

  var copyBtn = document.getElementById("btn-copy-line");
  if (copyBtn) copyBtn.addEventListener("click", function () {
    syncChatLine();
    var msg = document.getElementById("copy-msg");
    var text = chatLine();
    copyText(text, function (ok) {
      if (ok) { if (msg) msg.textContent = "복사했습니다. 전체 채팅에 붙여 넣으세요."; return; }
      var el = document.getElementById("chat-line");
      if (el) { el.removeAttribute("readonly"); el.select(); }
      var done2 = document.execCommand && document.execCommand("copy");
      if (msg) msg.textContent = done2
        ? "복사했습니다. 전체 채팅에 붙여 넣으세요."
        : "복사가 막혔습니다. 위 칸을 직접 선택해 복사하세요.";
      if (el) el.setAttribute("readonly", "readonly");
    });
  });

  /* ── 초기화 ── */
  collect();
  restore();
  fields.forEach(function (el) { if (el.tagName === "TEXTAREA") grow(el); });
  tally();
  spy();
  updateCount();
  syncChatLine();

  var CHAT_KEYS = /^(f-name|f-subject|k1|k2)$/;

  document.addEventListener("input", function (e) {
    var el = e.target;
    if (!isField(el)) return;
    if (el.tagName === "TEXTAREA") grow(el);
    updateCount(el.id);
    if (CHAT_KEYS.test(el.id)) syncChatLine();
    if (el.type !== "checkbox" && el.type !== "radio") scheduleSave(el);
  });

  document.addEventListener("change", function (e) {
    var el = e.target;
    if (!isField(el)) return;
    clearRadioSiblings(el);
    scheduleSave(el);
    if (el.type === "checkbox") tally();
    if (el.type === "radio") syncChatLine();
  });

  window.addEventListener("beforeunload", function () {
    clearTimeout(saveTimer);
    commit();
  });

  /* ── 인쇄 ── */
  var reclose = [];
  window.addEventListener("beforeprint", function () {
    reclose = [];
    document.querySelectorAll("details:not([open])").forEach(function (d) {
      d.open = true;
      reclose.push(d);
    });
    document.querySelectorAll("textarea").forEach(grow);
  });
  window.addEventListener("afterprint", function () {
    reclose.forEach(function (d) { d.open = false; });
    reclose = [];
  });

  var printBtn = document.getElementById("btn-print");
  if (printBtn) printBtn.addEventListener("click", function () { window.print(); });

  if (!store && flag) {
    flag.textContent = "저장 안 됨";
    flag.classList.add("on");
    flag.style.color = "var(--seal)";
  }

  /* ── 앵커로 점프하면 접힌 곳을 펴 준다 ── */
  function openTarget() {
    var id = location.hash.slice(1);
    if (!id) return;
    var el = document.getElementById(id);
    if (!el) return;
    var d = el.tagName === "DETAILS" ? el : el.closest("details");
    while (d) {
      d.open = true;
      d = d.parentElement && d.parentElement.closest("details");
    }
    el.scrollIntoView({ block: "start" });
  }
  window.addEventListener("hashchange", openTarget);
  if (location.hash) setTimeout(openTarget, 0);

  /* ── 상단 고정 요소 실측 ──
     좁은 폭에서 툴바가 줄바꿈하면 고정 높이보다 커져 가로 레일과 겹치고,
     앵커로 점프했을 때 착지 지점의 첫 줄이 잘린다. 실제 높이를 재서 CSS 변수로 넘긴다. */
  (function stickyMetrics() {
    var topbar = document.querySelector(".topbar");
    var rail = document.querySelector(".rail");
    if (!topbar) return;
    function measure() {
      var th = Math.round(topbar.getBoundingClientRect().height);
      var rh = rail && getComputedStyle(rail).position === "sticky"
        ? Math.round(rail.getBoundingClientRect().height) : 0;
      var root = document.documentElement.style;
      root.setProperty("--topbar-h", th + "px");
      root.setProperty("--sticky-h", th + rh + 22 + "px");
    }
    measure();
    if ("ResizeObserver" in window) {
      var ro = new ResizeObserver(measure);
      ro.observe(topbar);
      if (rail) ro.observe(rail);
    }
    window.addEventListener("resize", measure);
  })();

  /* ── 텍스트 백업 ── */
  var exportBtn = document.getElementById("btn-export");
  if (exportBtn) exportBtn.addEventListener("click", function () {
    var lines = ["3일차 활동지 — 같은 하루, 두 번 쓰기 · 문화탐방기행집", ""];
    parts.forEach(function (sec) {
      var head = sec.querySelector(".part__title");
      var railItem = document.querySelector('.rail__item[data-for="' + sec.id + '"] .rail__link');
      lines.push("──────────────────────────────");
      lines.push(head ? head.textContent.trim() : railItem ? railItem.textContent.trim() : sec.id);
      lines.push("");
      sec.querySelectorAll("[data-k]").forEach(function (el) {
        if (el.type === "checkbox" || el.type === "radio") return;
        var v = (el.value || "").trim();
        if (!v) return;
        /* 라벨이 붙은 칸은 라벨을, 없으면 aria-label이나 placeholder를 이름으로 쓴다. */
        var lab = el.id ? sec.querySelector('label[for="' + el.id + '"]') : null;
        var name = lab ? lab.textContent.trim()
                 : el.getAttribute("aria-label") || el.getAttribute("placeholder") || el.dataset.k;
        lines.push("· " + name);
        lines.push("  " + v.replace(/\n/g, "\n  "));
        lines.push("");
      });
    });
    lines.push("──────────────────────────────");
    lines.push("채팅 한 줄: " + chatLine());
    var blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    var a = document.createElement("a");
    var who = val("f-name") || "이름";
    a.href = URL.createObjectURL(blob);
    a.download = "D3_" + who.replace(/\s+/g, "") + "_활동지.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  });

  var resetBtn = document.getElementById("btn-reset");
  if (resetBtn) resetBtn.addEventListener("click", function () {
    if (!confirm("이 활동지(3일차)에 적은 내용을 전부 지웁니다. 1·2일차 저장은 건드리지 않습니다. 계속할까요?")) return;
    fields.forEach(function (el) {
      if (el.type === "checkbox" || el.type === "radio") el.checked = false;
      else el.value = "";
      if (store) store.removeItem(NS + el.dataset.k);
      grow(el);
    });
    tally();
    updateCount();
    syncChatLine();
    window.scrollTo({ top: 0, behavior: "auto" });
  });

  if (!store) {
    var warn = document.createElement("p");
    warn.className = "warn";
    warn.textContent =
      "이 브라우저에서는 적으신 내용이 자동으로 저장되지 않습니다. 창을 닫기 전에 인쇄 · PDF로 남겨 두십시오.";
    var main = document.querySelector(".page");
    if (main) main.insertBefore(warn, main.firstChild);
  }
})();
