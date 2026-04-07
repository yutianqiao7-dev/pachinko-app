// ===== カメラ起動 =====
let stream = null;
let capturedImage = null;

async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment',
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      }
    });
    document.getElementById('video').srcObject = stream;
  } catch (err) {
    alert('カメラを起動できません: ' + err.message);
  }
}

// ===== 撮影 =====
function capturePhoto() {
  const video = document.getElementById('video');
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  capturedImage = canvas.toDataURL('image/jpeg', 0.8);

  document.getElementById('previewImg').src = capturedImage;
  document.getElementById('preview').style.display = 'block';
  document.getElementById('cameraView').style.display = 'none';

  // 前回の店舗・機種を自動入力
  const last = getRecords()[0];
  if (last) {
    document.getElementById('store').value = last.store || '';
    document.getElementById('machine').value = last.machine || '';
  }
}

function cancelCapture() {
  capturedImage = null;
  document.getElementById('preview').style.display = 'none';
  document.getElementById('cameraView').style.display = 'block';
  clearForm();
}

function clearForm() {
  ['seatNo', 'spins', 'memo'].forEach(id => {
    document.getElementById(id).value = '';
  });
}

// ===== データ保存 (localStorage) =====
function getRecords() {
  return JSON.parse(localStorage.getItem('records') || '[]');
}

function saveRecord() {
  const spins = parseInt(document.getElementById('spins').value);
  const investment = parseInt(document.getElementById('investment').value);

  if (!spins || !investment) {
    alert('投資額と回転数は必須です');
    return;
  }

  const rate = Math.round((spins / investment) * 10000 * 10) / 10;

  const record = {
    id: Date.now(),
    date: new Date().toISOString(),
    store: document.getElementById('store').value,
    machine: document.getElementById('machine').value,
    seatNo: document.getElementById('seatNo').value,
    investment: investment,
    spins: spins,
    rate: rate,
    memo: document.getElementById('memo').value,
    image: capturedImage
  };

  const records = getRecords();
  records.unshift(record);
  localStorage.setItem('records', JSON.stringify(records));

  alert(`保存しました\n1万円あたり ${rate} 回転`);
  cancelCapture();
  renderList();
}

// ===== 一覧表示 =====
function renderList() {
  const records = getRecords();
  document.getElementById('count').textContent = records.length;

  const html = records.map(r => `
    <div class="record-item">
      <img src="${r.image}">
      <div class="info">
        <div class="rate">${r.rate} 回転/1万円</div>
        <div>${r.machine || '-'} @ ${r.store || '-'}</div>
        <div style="color:#888; font-size:12px;">
          ${new Date(r.date).toLocaleString('ja-JP')}
          ${r.memo ? ' / ' + r.memo : ''}
        </div>
      </div>
    </div>
  `).join('');

  document.getElementById('records').innerHTML = html || '<p style="color:#888;">まだ記録がありません</p>';
}

// ===== CSV書き出し =====
function exportCSV() {
  const records = getRecords();
  if (records.length === 0) {
    alert('記録がありません');
    return;
  }

  const header = '日付,店舗,機種,台番号,投資額,回転数,1万円あたり,メモ\n';
  const rows = records.map(r =>
    [r.date, r.store, r.machine, r.seatNo, r.investment, r.spins, r.rate, r.memo]
      .map(v => `"${(v || '').toString().replace(/"/g, '""')}"`)
      .join(',')
  ).join('\n');

  const csv = '\uFEFF' + header + rows;
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pachinko_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();

  // 画像も一緒に保存できるようJSONも出す
  const jsonBlob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
  const jsonUrl = URL.createObjectURL(jsonBlob);
  const a2 = document.createElement('a');
  a2.href = jsonUrl;
  a2.download = `pachinko_${new Date().toISOString().slice(0,10)}.json`;
  a2.click();
}

function clearAll() {
  if (confirm('全ての記録を削除します。よろしいですか?')) {
    localStorage.removeItem('records');
    renderList();
  }
}

// ===== 画面切り替え =====
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(name).classList.add('active');
  document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');

  if (name === 'list') renderList();
}

// ===== 初期化 =====
window.addEventListener('load', () => {
  startCamera();
  renderList();

  // PWA登録
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
});
