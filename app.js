import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBqR8bkOF0a7RaL_Rkaz7MIg56wcWfoZek",
  authDomain: "database-1c626.firebaseapp.com",
  projectId: "database-1c626",
  storageBucket: "database-1c626.firebasestorage.app",
  messagingSenderId: "815988357212",
  appId: "1:815988357212:web:e25569a811990059c34e99",
  measurementId: "G-8FHGC1J0EG"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 画面切り替え機能
window.showScreen = function(screenId) {
    document.querySelectorAll('.screen').forEach(el => el.style.display = 'none');
    document.getElementById(screenId).style.display = 'block';
}

// 登録画面：ボタンを押して記号([[]]など)を挿入する機能
window.insertText = function(prefix, suffix) {
    const textarea = document.getElementById("reg-details");
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    
    // 選択範囲の前後に記号を挿入
    const newText = text.substring(0, start) + prefix + text.substring(start, end) + suffix + text.substring(end);
    textarea.value = newText;
    
    // カーソル位置を戻す
    textarea.focus();
    textarea.selectionEnd = start + prefix.length;
}

// データ保存機能
window.saveData = async function() {
    const lastname = document.getElementById("reg-lastname").value;
    const firstname = document.getElementById("reg-firstname").value;
    const gender = document.getElementById("reg-gender").value;
    const details = document.getElementById("reg-details").value;

    try {
        await addDoc(collection(db, "persons"), {
            lastname: lastname,
            firstname: firstname,
            gender: gender,
            details: details,
            createdAt: new Date()
        });
        alert("登録しました！");
        document.getElementById("reg-details").value = ""; // 入力欄リセット
        showScreen('search-screen'); // 検索画面に戻る
    } catch (e) {
        console.error("エラー: ", e);
        alert("保存に失敗しました。FirebaseのFirestoreが作成されているか確認してください。");
    }
}

// 検索機能
window.searchData = async function() {
    const searchLastname = document.getElementById("search-lastname").value;
    const searchGender = document.getElementById("search-gender").value;
    
    const q = query(collection(db, "persons"));
    const querySnapshot = await getDocs(q);
    
    const tbody = document.getElementById("result-body");
    tbody.innerHTML = ""; // 一旦クリア

    let results = [];
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        let match = true;
        
        // 苗字が入力されていて、一致しなければ除外
        if (searchLastname && data.lastname !== searchLastname) {
            match = false;
        }
        // 性別が選択されていて、一致しなければ除外
        if (searchGender && data.gender !== searchGender) {
            match = false;
        }

        if(match) {
            results.push({ id: doc.id, ...data });
        }
    });

    // 検索結果をテーブルに表示
    results.forEach(data => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${data.lastname} ${data.firstname}</td>
            <td>${data.gender}</td>
            <td>-</td>
            <td><button onclick="viewDetail('${encodeURIComponent(JSON.stringify(data))}')">詳細</button></td>
        `;
        tbody.appendChild(tr);
    });

    if(results.length === 0) {
        tbody.innerHTML = "<tr><td colspan='4'>見つかりませんでした</td></tr>";
    }
}

// 詳細画面の表示とWiki風テキスト変換
window.viewDetail = function(dataStr) {
    const data = JSON.parse(decodeURIComponent(dataStr));
    
    document.getElementById("view-name").innerText = `${data.lastname} ${data.firstname}`;
    document.getElementById("view-basic-info").innerText = `性別: ${data.gender}`;
    
    // Wiki風記法をHTMLに変換する
    let htmlText = data.details || "";
    
    // HTMLエスケープ（安全のため）
    htmlText = htmlText.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    
    // 1. == 見出し == を <h3> に変換
    htmlText = htmlText.replace(/== (.*?) ==/g, "<h3>$1</h3>");
    // 2. **太字** を <strong> に変換
    htmlText = htmlText.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    // 3. [[名前]] をリンクに変換
    htmlText = htmlText.replace(/\[\[(.*?)\]\]/g, "<a onclick=\"searchFromLink('$1')\">$1</a>");
    // 4. 改行を <br> に
    htmlText = htmlText.replace(/\n/g, "<br>");

    document.getElementById("view-details").innerHTML = htmlText;
    showScreen('detail-screen');
}

// リンク化された名前をクリックしたときの動作
window.searchFromLink = function(name) {
    document.getElementById("search-lastname").value = name;
    document.getElementById("search-gender").value = "";
    showScreen('search-screen');
    searchData();
}
