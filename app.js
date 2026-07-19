const STORAGE_KEY = "my-gym-training-v1";

const exercises = [
  { id: "ez-bar-curl", name: "EZバーカール", target: "8〜12回 × 3セット", guide: "立ったまま。肩幅の外側グリップ。反動なしで下ろしをゆっくり。", weight: 20 },
  { id: "overhead-extension", name: "ケーブル・オーバーヘッドエクステンション", target: "10〜12回 × 3セット", guide: "片側のケーブルにロープを付け、背を向けて斜め前上へ伸ばす。", weight: 10 },
  { id: "hammer-curl", name: "ハンマーカール", target: "10〜15回 × 3セット", guide: "親指を上にして肘を固定。重量は片手分を記録。", weight: 7 },
  { id: "rope-pushdown", name: "ローププレスダウン", target: "10〜15回 × 3セット", guide: "肘を脇腹に固定し、肘から先だけを伸ばす。", weight: 12.5 },
];

const today = () => new Date().toLocaleDateString("sv-SE");
const initialState = () => ({
  date: today(), endpoint: "", exercises: exercises.map((exercise) => ({ ...exercise, sets: Array.from({ length: 3 }, () => ({ weight: String(exercise.weight), reps: "", note: "", synced: false })) })),
});

let state = load();
const list = document.querySelector("#exercise-list");
const dateInput = document.querySelector("#date");
const endpointInput = document.querySelector("#endpoint");
const status = document.querySelector("#status");

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || initialState(); }
  catch { return initialState(); }
}

function save(message = "入力内容を保存しました。") {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  status.textContent = message;
  renderProgress();
}

function renderProgress() {
  const done = state.exercises.flatMap((exercise) => exercise.sets).filter((set) => set.reps).length;
  document.querySelector("#progress").textContent = `${done} / 12 セット完了`;
}

function render() {
  dateInput.value = state.date;
  endpointInput.value = state.endpoint;
  list.replaceChildren();
  state.exercises.forEach((exercise, exerciseIndex) => {
    const card = document.createElement("section");
    card.className = "exercise-card";
    card.innerHTML = `<h2>${exercise.name}</h2><p class="target">${exercise.target}</p><p class="guide">${exercise.guide}</p><div class="set-list"></div>`;
    const setList = card.querySelector(".set-list");
    exercise.sets.forEach((set, setIndex) => {
      const row = document.createElement("div");
      row.className = "set-row";
      row.innerHTML = `
        <strong class="set-number">#${setIndex + 1}</strong>
        <label><span class="small-label">kg</span><input inputmode="decimal" value="${set.weight}"></label>
        <label><span class="small-label">回数</span><input inputmode="numeric" value="${set.reps}"></label>
        <input class="note" value="${set.note}" placeholder="メモ（反動、痛みなど）">
        <button class="button secondary save-button ${set.synced ? "saved" : ""}">${set.synced ? "送信済み" : "保存"}</button>`;
      const inputs = row.querySelectorAll("input");
      ["weight", "reps", "note"].forEach((field, index) => inputs[index].addEventListener("input", (event) => {
        set[field] = event.target.value;
        set.synced = false;
        save();
      }));
      row.querySelector("button").addEventListener("click", () => syncSet(exerciseIndex, setIndex));
      setList.append(row);
    });
    list.append(card);
  });
  renderProgress();
}

async function syncSet(exerciseIndex, setIndex) {
  const exercise = state.exercises[exerciseIndex];
  const set = exercise.sets[setIndex];
  if (!set.weight || !set.reps) return save("重量と回数を入力してください。");
  if (!state.endpoint) return save("Google Apps ScriptのURLを設定してください。");
  const payload = { date: state.date, session: "Day A", exerciseId: exercise.id, exercise: exercise.name, setNumber: setIndex + 1, weightKg: Number(set.weight), reps: Number(set.reps), note: set.note, recordedAt: new Date().toISOString() };
  try {
    await fetch(state.endpoint, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload) });
    set.synced = true;
    save(`${exercise.name} Set ${setIndex + 1} を送信しました。`);
    render();
  } catch { save("送信に失敗しました。URLと通信状態を確認してください。"); }
}

dateInput.addEventListener("input", (event) => { state.date = event.target.value; save(); });
endpointInput.addEventListener("input", (event) => { state.endpoint = event.target.value; save(); });

document.querySelector("#new-session").addEventListener("click", () => {
  const endpoint = state.endpoint;
  state = initialState();
  state.endpoint = endpoint;
  save("新しいセッションを開始しました。");
  render();
});

document.querySelector("#copy-json").addEventListener("click", async () => {
  const data = { date: state.date, session: "Day A", exercises: state.exercises.map((exercise) => ({ name: exercise.name, sets: exercise.sets.map((set, index) => ({ set: index + 1, weightKg: Number(set.weight), reps: Number(set.reps), note: set.note })).filter((set) => set.reps) })) };
  await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
  save("ChatGPT向けJSONをコピーしました。");
});

document.querySelector("#download-csv").addEventListener("click", () => {
  const rows = [["date", "session", "exercise", "set", "weight_kg", "reps", "note"]];
  state.exercises.forEach((exercise) => exercise.sets.forEach((set, index) => { if (set.reps) rows.push([state.date, "Day A", exercise.name, String(index + 1), set.weight, set.reps, set.note]); }));
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `arm-workout-${state.date}.csv`;
  link.click();
  URL.revokeObjectURL(url);
});

render();
