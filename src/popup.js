document.addEventListener('DOMContentLoaded', function() {
    console.log('Popup загружен');
    
    const statusElement = document.getElementById('status');
    const currentPageElement = document.getElementById('currentPage');
    const savedPageElement = document.getElementById('savedPage');
    const infoElement = document.getElementById('info');
    const testButton = document.getElementById('testButton');
    const clearButton = document.getElementById('clearButton');
    
    function updateInfo() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {action: "getCurrentPage"}, function(response) {
                    if (chrome.runtime.lastError) {
                        console.log('Ошибка при получении данных:', chrome.runtime.lastError);
                        statusElement.textContent = 'Расширение не активно на этой странице';
                        currentPageElement.textContent = 'Неизвестно';
                        savedPageElement.textContent = 'Неизвестно';
                        infoElement.textContent = 'Перейдите на страницу с пагинацией УМ';
                        return;
                    }
                    
                    if (response) {
                        const currentPage = response.currentPage || 1;
                        const savedPage = response.savedPage || 1;
                        
                        if (currentPage > 1) {
                            statusElement.textContent = 'Активно (страница ' + currentPage + ')';
                            statusElement.style.color = '#4CAF50';
                        } else {
                            statusElement.textContent = 'Активно (страница 1)';
                            statusElement.style.color = '#2196F3';
                        }
                        
                        currentPageElement.textContent = currentPage;
                        savedPageElement.textContent = savedPage;
                        
                        if (savedPage > 1) {
                            infoElement.textContent = 'При изменении данных ученика вы останетесь на странице ' + savedPage;
                            infoElement.style.color = '#4CAF50';
                        } else {
                            infoElement.textContent = 'Нажмите на кнопку пагинации, чтобы сохранить текущую страницу';
                            infoElement.style.color = '#FF9800';
                        }
                        
                        testButton.disabled = false;
                        clearButton.disabled = false;
                    }
                });
            }
        });
    }
    
    testButton.addEventListener('click', function() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {action: "testRestore"}, function(response) {
                    if (response && response.success) {
                        alert('Тест восстановления выполнен успешно!');
                    } else {
                        alert('Ошибка при тестировании восстановления');
                    }
                    updateInfo();
                });
            }
        });
    });
    
    clearButton.addEventListener('click', function() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {action: "clearSavedPage"}, function(response) {
                    alert('Сохраненная страница очищена');
                    updateInfo();
                });
            }
        });
    });
    
    updateInfo();
    
    setInterval(updateInfo, 2000);
    
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.action === "updatePopup") {
            updateInfo();
        }
    });
}); 