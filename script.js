// ==UserScript==
// @name         快手批量下載
// @namespace    http://tampermonkey.net/
// @version      2025-02-08
// @description  快手個人主頁下所有短視頻下載，點擊滑動到底，點擊提取后之後再點擊下載即可
// @author       gkk
// @match        http://*/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// @include      *://www.kuaishou.com/profile/*
// @include      *://www.kuaishou.com/myFollow
// ==/UserScript==

(function() {
    'use strict';
    // 設置滾動間隔時間（毫秒）
    const scrollInterval = 1500;
    // 設置滾動步長（像素）
    const scrollStep = 500;
    // 添加樣式
    const style = document.createElement('style');
    const author = document.querySelector('.user-name').textContent.trim();
    style.textContent = `
        #floatBtn {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
            padding: 10px 20px;
            background: #2196F3;
            color: white;
            border: none;
            border-radius: 25px;
            cursor: pointer;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            font-family: Arial;
            transition: 0.3s;
        }

        #scrollBtn {
            position: fixed;
            bottom: 60px;
            right: 20px;
            z-index: 9999;
            padding: 10px 20px;
            background: #2196F3;
            color: white;
            border: none;
            border-radius: 25px;
            cursor: pointer;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            font-family: Arial;
            transition: 0.3s;
        }

        #srcPopup {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255,255,255,0.95);
            border-radius: 10px;
            padding: 20px;
            z-index: 10000;
            width: 80%;
            max-width: 600px;
            max-height: 80vh;
            overflow: auto;
            box-shadow: 0 8px 16px rgba(0,0,0,0.2);
        }

        .popup-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }

        .popup-title {
            color: #333;
            font-size: 1.2em;
            font-weight: bold;
        }

        #srcList {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 5px;
            font-family: monospace;
            white-space: pre-wrap;
            margin-top: 15px;
        }

        .close-btn {
            background: #ff4444;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 5px;
            cursor: pointer;
        }

        .download-btn {
            background: #4CAF50;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 5px;
            cursor: pointer;
            margin-top: 10px;
        }

    `;
    document.head.appendChild(style);

    // 創建浮動按鈕
    const floatBtn = document.createElement('button');
    const scrollBtn = document.createElement('button');
    floatBtn.id = 'floatBtn';
    floatBtn.textContent = '提取';
    document.body.appendChild(floatBtn);
    scrollBtn.id = 'scrollBtn';
    scrollBtn.textContent = '滾動到底';
    // 滾動狀態（true 表示滾動中，false 表示停止）
    let isScrolling = false;
    // 滾動定時器 ID
    let scrollIntervalId = null;
    // 滾動到底部的邏輯
    const stopRoll = () =>{
        if (scrollIntervalId) {
            clearInterval(scrollIntervalId);
            scrollIntervalId = null;
        };
        scrollBtn.textContent = '繼續';
        scrollBtn.style.backgroundColor = '#007bff';
        isScrolling = false;
    };
    const scrollToBottom = () => {
        const currentScroll = window.scrollY || window.pageYOffset;
        const pageHeight = document.body.scrollHeight;
        if (currentScroll + window.innerHeight < pageHeight) {
            window.scrollBy(0, scrollStep);
        } else {
            stopRoll();
        }
    };
    // 點擊按鈕時切換滾動狀態
    scrollBtn.addEventListener('click', () => {
        isScrolling = !isScrolling;
        if (isScrolling) {
            if (!scrollIntervalId) {
                scrollIntervalId = setInterval(scrollToBottom, scrollInterval);
            };
            scrollBtn.textContent = '停止';
            scrollBtn.style.backgroundColor = '#dc3545';
        } else {
            stopRoll();
        }
    });
    document.body.appendChild(scrollBtn);

    // 從 URL 中提取 authorId 的函數
    function extractAuthorId() {
        const url = window.location.href;
        const match = url.match(/https:\/\/www\.kuaishou\.com\/profile\/([^\/]+)/);
        if (match && match[1]) {
            return match[1];
        }
        return null;
    }

    // 提取 clientCacheKey 的函數
    function extractClientCacheKey(src) {
        if (typeof src !== 'string') {
            return null;
        }
        const match = src.match(/clientCacheKey=([^&]+)/);
        if (match && match[1]) {
            return match[1].match(/^[a-zA-Z0-9]+/)[0];
        }
        return null;
    }

    // 點擊事件處理
    floatBtn.addEventListener('click', () => {
        const posters = document.querySelectorAll('.poster-img');
        if (posters.length === 0) {
            alert('未找到任何 poster-img 元素');
            return;
        }

        // 提取所有 clientCacheKey
        const clientCacheKeys = Array.from(posters)
            .map(img => extractClientCacheKey(img.src))
            .filter(key => key !== null);

        if (clientCacheKeys.length === 0) {
            alert('未找到任何包含 clientCacheKey 的圖片連結');
            return;
        }

        // 從 URL 中提取 authorId
        const authorId = extractAuthorId();
        if (!authorId) {
            alert('無法從 URL 中提取 authorId');
            return;
        }

        // 創建彈窗
        const popup = document.createElement('div');
        popup.id = 'srcPopup';
        popup.innerHTML = `
            <div class="popup-header">
                <input type="number" id="startIndex" placeholder="起始" value="1" min="1">
                <button class="download-btn">下載視頻</button>
                <button class="close-btn">關閉</button>
            </div>
            <div id="srcList"></div>
        `;

        // 初始化列表內容
        const srcList = popup.querySelector('#srcList');
        clientCacheKeys.forEach((key, i) => {
            const listItem = document.createElement('div');
            listItem.id = `item-${i}`;
            listItem.textContent = `${i + 1}. ${key} - 等待處理...`;
            srcList.appendChild(listItem);
        });

        // 獲取下載按鈕
        const downloadBtn = popup.querySelector('.download-btn');

        // 監聽下載按鈕點擊
        downloadBtn.addEventListener('click', () => {
            const pageUrls = clientCacheKeys.map(key => `https://www.kuaishou.com/short-video/${key}?authorId=${authorId}`);
            const startIndex = parseInt(popup.querySelector('#startIndex').value, 10);
            processPages(pageUrls, startIndex-1, popup);
        });

        // 關閉功能
        const closeBtn = popup.querySelector('.close-btn');
        closeBtn.addEventListener('click', () => popup.remove());

        // 點擊外部關閉
        popup.addEventListener('click', (e) => {
            if (e.target === popup) popup.remove();
        });

        document.body.appendChild(popup);
    });

  // 定義一個函數來獲取子頁面的數據（使用彈窗）
    function fetchSubPageData(url, callback) {
        // 創建隱藏的 iframe
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);

        // 加載目標 URL
        iframe.src = url;

        // 監聽 iframe 加載完成
        iframe.onload = function() {
            try {
                // 跨域限制檢查
                if (iframe.contentWindow.location.href === 'about:blank') {
                    callback({ success: false, error: '跨域限制，無法訪問 iframe 內容' });
                    return;
                }
                // 獲取視頻元素和標題
                const videoElement = iframe.contentDocument.querySelector('video.player-video');
                const videoTitleElement = iframe.contentDocument.querySelector('.video-info-title');

                if (videoElement && videoElement.src && videoTitleElement) {
                    const src = videoElement.src;
                    const title = videoTitleElement.textContent.trim();
                    callback({ success: true, src, title });
                } else {
                    callback({ success: false, error: '未找到所需元素' });
                }
            } catch (error) {
                callback({ success: false, error: `跨域限制: ${error.message}` });
            } finally {
                // 清理 iframe
                document.body.removeChild(iframe);
            }
        };

        // 設置超時處理
        setTimeout(() => {
            if (iframe.contentWindow?.location.href !== url) {
                document.body.removeChild(iframe);
                callback({ success: false, error: '加載超時' });
            }
        }, 10000); // 10 秒超時
    }

    // 定義一個函數來順序處理頁面
    function processPages(pageUrls, index, popup) {
        if (index >= pageUrls.length) {
            return;
        }

        const url = pageUrls[index];
        const srcList = popup.querySelector('#srcList');

        // 獲取當前列表項
        const listItem = srcList.querySelector(`#item-${index}`);

        // 更新當前處理狀態
        listItem.textContent = `${index + 1}. ${url.split('/').pop()} - 處理中...`;

        // 獲取子頁面的數據
        fetchSubPageData(url, function(result) {
            if (result.success) {
                // 更新處理結果
                listItem.textContent = `${index + 1}. ${result.title} - 處理成功`;
                // 使用 GM_download 下載視頻
                const fileName = author+`_${pageUrls.length -index}_${result.title}.mp4`;
                setInterval(1000);
                GM_download({
                    url: result.src,
                    name: fileName,
                    onload: function() {
                        listItem.textContent = `${index + 1}. ${result.title} - 下載成功`;
                    },
                    onerror: function(error) {
                        listItem.textContent = `${index + 1}. ${result.title} - 下載失敗`;
                    }
                });
            } else {
                // 更新錯誤信息
                listItem.textContent = `${index + 1}. ${url.split('/').pop()} - 處理失敗: ${result.error}`;
            }

            // 間隔 2 秒後處理下一個頁面
            setTimeout(() => processPages(pageUrls, index + 1, popup), 2000);
        });
    }

})();
