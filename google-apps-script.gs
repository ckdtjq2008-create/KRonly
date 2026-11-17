/**
 * 국산모아 — 상품 등록 폼 자동 설정 (Google Apps Script)
 * ------------------------------------------------------------
 * 사용법
 *  1. 구글 시트 새로 만들기 → 확장 프로그램 → Apps Script
 *  2. 이 코드를 전부 붙여넣고 저장(💾) → 시트 탭으로 돌아가 새로고침
 *  3. 메뉴 [국산모아] → [① 등록 폼 만들기] → 권한 허용
 *  4. 폼 편집 화면에서 '파일 업로드' 질문 2개(제품사진, 원산지사진) 추가
 *  5. 메뉴 [국산모아] → [② 사진 공유 다시 적용] (이미 올린 사진이 있을 때만)
 *  6. 메뉴 [국산모아] → [③ 수정 링크 만들기] (한 번만. 이후 등록분은 자동)
 *  7. 메뉴 [국산모아] → [④ 사진 교체 폼 만들기] → 그 폼에도 '파일 업로드' 질문 2개 추가
 *
 * 하는 일
 *  - 질문·드롭다운이 들어간 폼을 만들고 이 시트에 응답이 쌓이게 연결
 *  - 응답 시트 이름을 '상품'으로 바꾸고 '노출'(O/X) 열 추가
 *  - 폼으로 올라온 사진을 자동으로 "링크가 있는 모든 사용자(뷰어)"로 공유
 *  - 상품마다 '수정링크'(✏️ 수정) 칸 생성 → 휴대폰에서 눌러 사진·내용을 고쳐 다시 제출
 *    (링크 주소는 웹 게시 CSV에 나가지 않고 "✏️ 수정" 글자만 나갑니다)
 *  - '사진 교체' 폼: 상품을 고르고 새 사진을 올리면 [제품사진교체]/[원산지사진교체] 칸에 기록
 *    (사이트는 교체 칸을 우선 표시. 원래 칸은 폼이 관리하므로 건드리지 않음)
 */

const FORM_TITLE = '국산모아 상품 등록';
const FOOD = ["간편식·냉동", "김치·반찬", "장·양념", "쌀·잡곡", "과일·채소", "정육·계란", "수산·건어물", "과자·간식", "음료·차", "유아식", "건강식품"];
const LIVING = ["주방용품", "세제·청소", "욕실·위생", "뷰티·바디", "문구·사무", "소형가전", "침구·인테리어"];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('국산모아')
    .addItem('① 등록 폼 만들기', 'setup')
    .addItem('② 사진 공유 다시 적용', 'shareAllUploads')
    .addItem('③ 수정 링크 만들기', 'addEditLinks')
    .addItem('④ 사진 교체 폼 만들기', 'setupPhotoForm')
    .addItem('폼 링크 보기', 'showLinks')
    .addToUi();
}

function setup() {
  const ui = SpreadsheetApp.getUi();
  const props = PropertiesService.getDocumentProperties();
  if (props.getProperty('FORM_ID')) {
    showLinks();
    return;
  }
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1) 폼 만들기
  const form = FormApp.create(FORM_TITLE);
  form.setDescription('국산모아에 올릴 상품을 등록합니다. 식품은 원재료 원산지가 모두 한국, 생활용품은 제조국이 한국이어야 사이트에 나옵니다.')
    .setConfirmationMessage('등록됐어요. 몇 분 안에 사이트에 반영됩니다.')
    .setAllowResponseEdits(true);

  form.addTextItem().setTitle('상품명').setRequired(true)
    .setHelpText('쿠팡 상품명 그대로 써도 돼요 (용량·개수 포함)');
  form.addTextItem().setTitle('쿠팡링크').setRequired(true)
    .setHelpText('쿠팡 파트너스 단축 링크 (https://link.coupang.com/a/...)')
    .setValidation(FormApp.createTextValidation()
      .requireTextMatchesPattern('https?://.*coupang\\.com.*')
      .setHelpText('쿠팡 링크를 붙여넣어 주세요').build());
  form.addListItem().setTitle('카테고리').setRequired(true)
    .setHelpText('식품: ' + FOOD.join(', ') + ' / 생활용품: ' + LIVING.join(', '))
    .setChoiceValues(FOOD.concat(LIVING));
  form.addListItem().setTitle('원재료원산지')
    .setHelpText('식품만 선택 (생활용품은 비워두세요)')
    .setChoiceValues(['한국', '수입 원료 포함(사이트에 안 나옴)']);
  form.addListItem().setTitle('제조국')
    .setHelpText('생활용품만 선택 (식품은 비워두세요)')
    .setChoiceValues(['한국', '해외 제조(사이트에 안 나옴)']);
  form.addDateItem().setTitle('검수일').setIncludesYear(true)
    .setHelpText('표시사항을 확인한 날. 비우면 제출한 날로 들어가요');
  form.addListItem().setTitle('보관').setChoiceValues(['상온', '냉장', '냉동']);
  form.addTextItem().setTitle('테마')
    .setHelpText('홈 화면 가로 줄 이름. 여러 개는 쉼표로 (예: 김장 준비, 아이 간식)');
  form.addCheckboxItem().setTitle('추천').setChoiceValues(['추천']);
  form.addTextItem().setTitle('브랜드');
  form.addParagraphTextItem().setTitle('설명').setHelpText('상세 화면에 나오는 한 줄 설명');
  form.addTextItem().setTitle('태그').setHelpText('검색어. 쉼표로 구분 (예: 두부, 국산콩)');

  // 2) 이 시트에 응답 연결
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  props.setProperty('FORM_ID', form.getId());

  // 응답 시트가 생길 때까지 잠깐 기다림
  let sheet = null;
  for (let i = 0; i < 15 && !sheet; i++) {
    SpreadsheetApp.flush();
    Utilities.sleep(1000);
    sheet = SpreadsheetApp.openById(ss.getId()).getSheets().find(function (s) {
      const u = s.getFormUrl();
      return u && u.indexOf(form.getId()) >= 0;
    }) || SpreadsheetApp.openById(ss.getId()).getSheets().filter(function (s) { return s.getFormUrl(); }).pop();
  }
  if (sheet) {
    if (!ss.getSheetByName('상품')) sheet.setName('상품');
    addVisibleColumn_(sheet);
    ss.setActiveSheet(ss.getSheetByName(sheet.getName()));
  }

  // 3) 사진 자동 공유 트리거
  ScriptApp.newTrigger('onSubmit').forForm(form).onFormSubmit().create();

  writeGuide_(form);
  ui.alert('폼을 만들었어요',
    '이제 할 일 2가지\n\n' +
    '1) 폼에 사진 질문 추가 (스크립트로는 못 만드는 유형이라 직접)\n' +
    '   폼 편집 링크: ' + form.getEditUrl() + '\n' +
    '   → ＋ 질문 추가 → 유형 "파일 업로드" → 제목 "제품사진"\n' +
    '   → 한 번 더: 제목 "원산지사진"  (둘 다 "특정 파일 형식만: 이미지")\n\n' +
    '2) 파일 → 공유 → 웹에 게시 → [상품] 탭 + [쉼표로 구분된 값(.csv)] → 게시 → 주소 복사\n\n' +
    '링크는 [안내] 탭에도 적어두었어요.', ui.ButtonSet.OK);
}

// '노출' 열: O 또는 비우면 보임, X면 숨김
function addVisibleColumn_(sheet) {
  const headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
  if (headers.indexOf('노출') >= 0) return;
  const col = sheet.getLastColumn() + 1;
  const h = sheet.getRange(1, col);
  h.setValue('노출').setFontWeight('bold')
    .setNote('비우거나 O = 사이트에 보임\nX = 숨김 (행을 지우지 않고 내릴 때)');
  const rule = SpreadsheetApp.newDataValidation().requireValueInList(['O', 'X'], true).setAllowInvalid(false).build();
  sheet.getRange(2, col, Math.max(sheet.getMaxRows() - 1, 1), 1).setDataValidation(rule);
  sheet.setFrozenRows(1);
}

// 폼 제출 시: 올라온 사진을 링크 공유로
function onSubmit(e) {
  shareResponse_(e.response);
  try {
    Utilities.sleep(5000); // 응답이 시트에 기록될 때까지 잠깐 대기
    addEditLinks_();
    refreshPhotoChoices();
  } catch (err) {
    console.error('수정 링크 갱신 실패: ' + err);
  }
}

function shareResponse_(response) {
  response.getItemResponses().forEach(function (r) {
    if (r.getItem().getType() !== FormApp.ItemType.FILE_UPLOAD) return;
    [].concat(r.getResponse() || []).forEach(function (id) {
      try {
        DriveApp.getFileById(id).setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (err) {
        console.error('공유 실패 ' + id + ': ' + err);
      }
    });
  });
}

// 이미 올린 사진 전부 다시 공유 (트리거 만들기 전에 올린 것 등)
function shareAllUploads() {
  const form = getForm_();
  if (!form) return;
  const responses = form.getResponses();
  responses.forEach(shareResponse_);
  SpreadsheetApp.getUi().alert('응답 ' + responses.length + '개의 사진을 "링크가 있는 모든 사용자"로 공유했어요.');
}

// 메뉴: 모든 상품 줄에 수정 링크 채우기
function addEditLinks() {
  const n = addEditLinks_();
  SpreadsheetApp.getUi().alert('수정 링크를 ' + n + '개 만들었어요.\n\n' +
    '상품 탭의 [수정링크] 칸 "✏️ 수정"을 누르면 그 상품의 폼이 열립니다.\n' +
    '글자 내용을 고쳐 제출하면 같은 줄이 바뀌어요. 사진은 [④ 사진 교체 폼]으로 바꾸세요.\n\n' +
    '이후 새로 등록하는 상품은 자동으로 링크가 생깁니다.');
}

function addEditLinks_() {
  const id = PropertiesService.getDocumentProperties().getProperty('FORM_ID');
  if (!id) return 0;
  const form = FormApp.openById(id);
  const sheet = productSheet_();
  if (!sheet || sheet.getLastRow() < 2) return 0;

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  let col = headers.indexOf('수정링크') + 1;
  if (!col) {
    col = sheet.getLastColumn() + 1;
    sheet.getRange(1, col).setValue('수정링크').setFontWeight('bold')
      .setNote('누르면 이 상품을 등록한 폼이 열려요. 사진·내용을 고쳐 제출하면 이 줄이 바뀝니다.');
  }
  const tsCol = Math.max(headers.indexOf('타임스탬프'), 0);
  const nameCol = headers.indexOf('상품명');
  const linkCol = headers.indexOf('쿠팡링크');

  // 응답 ↔ 시트 줄 연결: 제출 시각(초) 우선, 안 맞으면 상품명+쿠팡링크
  const byTs = {}, byKey = {};
  form.getResponses().forEach(function (r) {
    const url = r.getEditResponseUrl();
    byTs[Math.floor(r.getTimestamp().getTime() / 1000)] = url;
    const v = {};
    r.getItemResponses().forEach(function (ir) { v[ir.getItem().getTitle()] = ir.getResponse(); });
    byKey[String(v['상품명'] || '').trim() + '|' + String(v['쿠팡링크'] || '').trim()] = url;
  });

  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  let n = 0;
  const out = rows.map(function (row) {
    const t = row[tsCol] instanceof Date ? Math.floor(row[tsCol].getTime() / 1000) : null;
    const key = (nameCol >= 0 ? String(row[nameCol]).trim() : '') + '|' + (linkCol >= 0 ? String(row[linkCol]).trim() : '');
    const url = (t && (byTs[t] || byTs[t - 1] || byTs[t + 1])) || byKey[key];
    if (url) n++;
    return [url ? '=HYPERLINK("' + url + '","✏️ 수정")' : ''];
  });
  sheet.getRange(2, col, out.length, 1).setFormulas(out);
  return n;
}

// 상품 응답 시트 찾기
function productSheet_() {
  const id = PropertiesService.getDocumentProperties().getProperty('FORM_ID');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheets().find(function (sh) {
    const u = sh.getFormUrl();
    return id && u && u.indexOf(id) >= 0;
  }) || ss.getSheetByName('상품');
}

/* ---------- 사진 교체 폼 ---------- */

function setupPhotoForm() {
  const ui = SpreadsheetApp.getUi();
  const props = PropertiesService.getDocumentProperties();
  const existing = props.getProperty('PHOTO_FORM_ID');
  if (existing) {
    refreshPhotoChoices();
    const f0 = FormApp.openById(existing);
    ui.alert('사진 교체 폼', '작성(휴대폰): ' + f0.getPublishedUrl() + '\n\n편집: ' + f0.getEditUrl(), ui.ButtonSet.OK);
    return;
  }
  const f = FormApp.create('국산모아 사진 교체');
  f.setDescription('이미 등록한 상품의 사진을 바꿉니다. 상품을 고르고 바꿀 사진만 올리세요. 비워둔 사진은 그대로예요.')
    .setConfirmationMessage('사진을 바꿨어요. 몇 분 안에 사이트에 반영됩니다.');
  f.addListItem().setTitle('상품').setRequired(true).setHelpText('최근 등록한 상품이 위에 있어요')
    .setChoiceValues(['(목록 준비 중)']);
  props.setProperty('PHOTO_FORM_ID', f.getId());
  refreshPhotoChoices();
  ScriptApp.newTrigger('onPhotoSubmit').forForm(f).onFormSubmit().create();
  ScriptApp.newTrigger('refreshPhotoChoices').timeBased().everyHours(1).create();
  writeGuide_(FormApp.openById(props.getProperty('FORM_ID')));
  ui.alert('사진 교체 폼을 만들었어요',
    '이 폼에도 사진 질문 2개를 직접 추가해 주세요 (필수 아님으로):\n' +
    '   편집 링크: ' + f.getEditUrl() + '\n' +
    '   → ＋ → "파일 업로드" → 제목 "제품사진"\n' +
    '   → 한 번 더: 제목 "원산지사진"\n\n' +
    '휴대폰에서 쓸 작성 링크는 [안내] 탭에 있어요.', ui.ButtonSet.OK);
}

// 사진 교체 폼의 상품 목록을 시트와 맞춤 (상품 등록 때 + 1시간마다 자동)
function refreshPhotoChoices() {
  const id = PropertiesService.getDocumentProperties().getProperty('PHOTO_FORM_ID');
  if (!id) return;
  const sheet = productSheet_();
  if (!sheet) return;
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  const nameCol = headers.indexOf('상품명');
  let names = [];
  if (nameCol >= 0 && sheet.getLastRow() >= 2) {
    names = sheet.getRange(2, nameCol + 1, sheet.getLastRow() - 1, 1).getValues()
      .map(function (r) { return String(r[0]).trim(); })
      .filter(function (v) { return v; })
      .reverse();
    names = names.filter(function (v, i) { return names.indexOf(v) === i; });
  }
  const item = FormApp.openById(id).getItems(FormApp.ItemType.LIST)[0];
  if (item) item.asListItem().setChoiceValues(names.length ? names : ['(등록된 상품 없음)']);
}

// 사진 교체 제출 → 사진 공유 + 시트의 [제품사진교체]/[원산지사진교체] 칸에 기록
function onPhotoSubmit(e) {
  shareResponse_(e.response);
  let name = '';
  const files = {};
  e.response.getItemResponses().forEach(function (ir) {
    const item = ir.getItem();
    const title = item.getTitle().replace(/\s/g, '');
    if (item.getType() === FormApp.ItemType.FILE_UPLOAD) {
      const ids = [].concat(ir.getResponse() || []);
      if (ids.length) files[title] = ids[0];
    } else if (title === '상품') {
      name = String(ir.getResponse()).trim();
    }
  });
  const sheet = productSheet_();
  if (!sheet || !name) return;
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  const nameCol = headers.indexOf('상품명');
  if (nameCol < 0) return;
  const names = sheet.getRange(2, nameCol + 1, Math.max(sheet.getLastRow() - 1, 1), 1).getValues();
  [['제품사진', '제품사진교체'], ['원산지사진', '원산지사진교체']].forEach(function (pair) {
    const fileId = files[pair[0]];
    if (!fileId) return;
    let col = headers.indexOf(pair[1]) + 1;
    if (!col) {
      col = sheet.getLastColumn() + 1;
      sheet.getRange(1, col).setValue(pair[1]).setFontWeight('bold')
        .setNote("'사진 교체' 폼으로 바꾼 사진. 있으면 사이트는 이 사진을 보여줘요. 지우면 원래 사진으로 돌아갑니다.");
      headers.push(pair[1]);
    }
    names.forEach(function (r, i) {
      if (String(r[0]).trim() === name) {
        sheet.getRange(i + 2, col).setValue('https://drive.google.com/open?id=' + fileId);
      }
    });
  });
}

function showLinks() {
  const form = getForm_();
  if (!form) return;
  writeGuide_(form);
  SpreadsheetApp.getUi().alert('폼 링크',
    '상품 등록(작성): ' + form.getPublishedUrl() + '\n\n폼 편집: ' + form.getEditUrl(),
    SpreadsheetApp.getUi().ButtonSet.OK);
}

function getForm_() {
  const id = PropertiesService.getDocumentProperties().getProperty('FORM_ID');
  if (!id) { SpreadsheetApp.getUi().alert('먼저 [① 등록 폼 만들기]를 실행하세요.'); return null; }
  return FormApp.openById(id);
}

function writeGuide_(form) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const pid = PropertiesService.getDocumentProperties().getProperty('PHOTO_FORM_ID');
  const photoUrl = pid ? FormApp.openById(pid).getPublishedUrl() : '';
  const sh = ss.getSheetByName('안내') || ss.insertSheet('안내');
  sh.clear();
  sh.getRange(1, 1, 10, 2).setValues([
    ['상품 등록 폼 (작성)', form.getPublishedUrl()],
    ['폼 편집', form.getEditUrl()],
    ['', ''],
    ['웹에 게시', '파일 → 공유 → 웹에 게시 → [상품] 탭 + [쉼표로 구분된 값(.csv)]'],
    ['노출 열', '비우거나 O = 보임, X = 숨김'],
    ['사진', '폼으로 올리면 자동으로 링크 공유됨. 안 보이면 메뉴 [국산모아] → [② 사진 공유 다시 적용]'],
    ['주의', '폼 작성 링크는 다른 사람에게 알려주지 마세요 (누구나 상품을 올릴 수 있음)'],
    ['상품 수정', '[상품] 탭 [수정링크] 칸의 "✏️ 수정" → 글자 내용 고쳐 제출 (사진은 아래 사진 교체 폼으로)'],
    ['사진 교체 폼', photoUrl || '메뉴 [국산모아] → [④ 사진 교체 폼 만들기]'],
    ['', '이 [안내] 탭은 게시하지 마세요'],
  ]);
  sh.getRange('A1:A10').setFontWeight('bold');
  sh.setColumnWidth(1, 140);
  sh.setColumnWidth(2, 640);
}
