(function() {
    'use strict';
    
    console.log('УМ Исправление страниц');
    
    let currentPage = 1;
    let isRestoring = false;
    let restoreAttempts = 0;
    const MAX_RESTORE_ATTEMPTS = 10;
    
    function saveCurrentPage(pageNumber) {
        if (typeof pageNumber === 'number' && pageNumber > 0) {
            currentPage = pageNumber;
            chrome.storage.local.set({ 'currentPage': pageNumber }, function() {
                console.log('Сохранена страница:', pageNumber);
            });
        }
    }
    
    function getSavedPage(callback) {
        chrome.storage.local.get(['currentPage'], function(result) {
            const savedPage = result.currentPage || 1;
            currentPage = savedPage;
            console.log('Восстановлена страница:', savedPage);
            callback(savedPage);
        });
    }
    
    function clearSavedPage() {
        chrome.storage.local.remove(['currentPage'], function() {
            currentPage = 1;
            console.log('Очищена сохраненная страница');
        });
    }
    
    function detectCurrentPage() {
        const buttons = findPaginationButtons();
        let detectedPage = 1;
        
        buttons.forEach(button => {
            const text = button.textContent.trim();
            const pageNumber = parseInt(text, 10);
            
            if (!isNaN(pageNumber)) {
                const isActive = button.classList.contains('active') || 
                               button.getAttribute('aria-current') === 'page' ||
                               button.style.backgroundColor !== '' ||
                               button.style.color !== '' ||
                               button.disabled === true ||
                               button.getAttribute('disabled') !== null;
                
                if (isActive) {
                    detectedPage = pageNumber;
                }
            }
        });
        
        return detectedPage;
    }
    
    function findPaginationElements() {
        const selectors = [
            '[data-pagination]',
            '.pagination',
            '[class*="pagination"]',
            '[class*="Pagination"]',
            'nav[role="navigation"]',
            'button[class*="btn"]',
            '[class*="nav"]',
            '[class*="page"]',
            '[class*="Page"]',
            'button:contains("1"), button:contains("2"), button:contains("3"), button:contains("4"), button:contains("5")',
            'button:contains("Следующая"), button:contains("Предыдущая")',
            'button:contains("Next"), button:contains("Previous")',
            '[onclick*="page"]',
            '[onclick*="Page"]',
            '[onclick*="setPage"]'
        ];
        
        let elements = [];
        selectors.forEach(selector => {
            try {
                const found = document.querySelectorAll(selector);
                elements = elements.concat(Array.from(found));
            } catch (e) {
            }
        });
        
        elements = [...new Set(elements)];
        
        console.log('Найдено элементов пагинации:', elements.length);
        return elements;
    }
    
    function findPaginationButtons() {
        const buttons = [];
        
        const allButtons = document.querySelectorAll('button, [role="button"], .btn, [class*="btn"]');
        
        allButtons.forEach(button => {
            const text = button.textContent.trim();
            const className = button.className || '';
            const onclick = button.getAttribute('onclick') || '';
            
            if (
                /^\d+$/.test(text) ||
                text.includes('Следующая') || text.includes('Next') || text.includes('>') ||
                text.includes('Предыдущая') || text.includes('Previous') || text.includes('<') ||
                className.includes('pagination') || className.includes('Pagination') ||
                className.includes('page') || className.includes('Page') ||
                className.includes('nav') || className.includes('Nav') ||
                onclick.includes('page') || onclick.includes('Page') || onclick.includes('setPage')
            ) {
                buttons.push(button);
            }
        });
        
        console.log('Найдено кнопок пагинации:', buttons.length);
        return buttons;
    }
    
    function applyPaginationFix() {
        console.log('Применяем исправление переключения страниц...');
        
        const paginationElements = findPaginationElements();
        const paginationButtons = findPaginationButtons();
        
        paginationButtons.forEach(function(button) {
            button.removeEventListener('click', handlePaginationClick);
            button.addEventListener('click', handlePaginationClick);
            
            console.log('Добавлен обработчик для кнопки:', button.textContent.trim());
        });
        
        paginationElements.forEach(function(element) {
            const buttons = element.querySelectorAll('button, [role="button"], .btn, [class*="btn"]');
            buttons.forEach(function(button) {
                button.removeEventListener('click', handlePaginationClick);
                button.addEventListener('click', handlePaginationClick);
            });
        });
        
        const detectedPage = detectCurrentPage();
        if (detectedPage > 1) {
            saveCurrentPage(detectedPage);
        }
    }
    
    function handlePaginationClick(e) {
        const button = e.target;
        const pageText = button.textContent.trim();
        const pageNumber = parseInt(pageText, 10);
        
        console.log('Клик по кнопке переключения страниц:', pageText);
        
        if (!isNaN(pageNumber)) {
            saveCurrentPage(pageNumber);
            console.log('Переход на страницу:', pageNumber);
        } else if (pageText.includes('Следующая') || 
                  pageText.includes('Next') ||
                  pageText.includes('>')) {
            getSavedPage(function(currentPage) {
                saveCurrentPage(currentPage + 1);
                console.log('Переход на следующую страницу:', currentPage + 1);
            });
        } else if (pageText.includes('Предыдущая') || 
                  pageText.includes('Previous') ||
                  pageText.includes('<')) {
            getSavedPage(function(currentPage) {
                const prevPage = Math.max(1, currentPage - 1);
                saveCurrentPage(prevPage);
                console.log('⬅Переход на предыдущую страницу:', prevPage);
            });
        }
    }
    
    function restorePageAfterUpdate() {
        if (isRestoring) {
            console.log('Восстановление уже в процессе...');
            return;
        }
        
        isRestoring = true;
        restoreAttempts = 0;
        
        function attemptRestore() {
            restoreAttempts++;
            console.log(`Попытка восстановления ${restoreAttempts}/${MAX_RESTORE_ATTEMPTS}`);
            
            getSavedPage(function(savedPage) {
                if (savedPage > 1) {
                    console.log('Восстанавливаем страницу:', savedPage);
                    
                    const buttons = findPaginationButtons();
                    let found = false;
                    
                    buttons.forEach(function(button) {
                        if (button.textContent.trim() === savedPage.toString()) {
                            console.log('Найдена кнопка страницы:', savedPage);
                            
                            const isActive = button.classList.contains('active') || 
                                           button.getAttribute('aria-current') === 'page' ||
                                           button.disabled === true;
                            
                            if (!isActive) {
                                button.click();
                                found = true;
                                console.log('Страница восстановлена успешно');
                            } else {
                                console.log('ℹСтраница уже активна');
                                found = true;
                            }
                        }
                    });
                    
                    if (!found && restoreAttempts < MAX_RESTORE_ATTEMPTS) {
                        console.log('Кнопка страницы не найдена, повторяем через 500мс...');
                        setTimeout(attemptRestore, 500);
                    } else if (restoreAttempts >= MAX_RESTORE_ATTEMPTS) {
                        console.log('Превышено максимальное количество попыток восстановления');
                        isRestoring = false;
                    } else {
                        isRestoring = false;
                    }
                } else {
                    console.log('ℹСохраненная страница 1, восстановление не требуется');
                    isRestoring = false;
                }
            });
        }
        
        setTimeout(attemptRestore, 100);
    }
    
    function interceptDataUpdates() {
        console.log('Настройка перехвата обновлений данных...');
        
        const originalFetch = window.fetch;
        window.fetch = function(...args) {
            const url = args[0];
            const options = args[1] || {};
            
            if (url && typeof url === 'string') {
                console.log('📡 Fetch запрос:', url, options.method || 'GET');
            }
            
            return originalFetch.apply(this, args).then(function(response) {
                if (url && typeof url === 'string') {
                    const isDataUpdate = url.includes('/students') || 
                                       url.includes('/users') || 
                                       url.includes('/update') || 
                                       url.includes('/edit') || 
                                       url.includes('/save') ||
                                       url.includes('/api/') ||
                                       url.includes('/data') ||
                                       url.includes('/submit') ||
                                       (options.method && options.method.toUpperCase() === 'PUT') ||
                                       (options.method && options.method.toUpperCase() === 'POST');
                    
                    if (isDataUpdate) {
                        console.log('Обнаружен fetch запрос обновления данных:', url);
                        setTimeout(restorePageAfterUpdate, 300);
                    }
                }
                return response;
            });
        };
        
        const originalXHROpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url, ...args) {
            if (url && typeof url === 'string') {
                console.log('XHR запрос:', method, url);
            }
            
            this.addEventListener('load', function() {
                if (url && typeof url === 'string') {
                    const isDataUpdate = url.includes('/students') || 
                                       url.includes('/users') || 
                                       url.includes('/update') || 
                                       url.includes('/edit') || 
                                       url.includes('/save') ||
                                       url.includes('/api/') ||
                                       url.includes('/data') ||
                                       url.includes('/submit') ||
                                       method.toUpperCase() === 'PUT' ||
                                       method.toUpperCase() === 'POST';
                    
                    if (isDataUpdate) {
                        console.log('Обнаружен XHR запрос обновления данных:', method, url);
                        setTimeout(restorePageAfterUpdate, 300);
                    }
                }
            });
            return originalXHROpen.apply(this, [method, url, ...args]);
        };
        
        const originalSetItem = Storage.prototype.setItem;
        Storage.prototype.setItem = function(key, value) {
            console.log('Storage setItem:', key, value ? value.substring(0, 50) + '...' : 'null');
            
            if (key.includes('student') || key.includes('user') || key.includes('data') || 
                key.includes('form') || key.includes('input') || key.includes('state')) {
                console.log('Обнаружено сохранение данных:', key);
                setTimeout(restorePageAfterUpdate, 300);
            }
            return originalSetItem.call(this, key, value);
        };
        
        if (window.React) {
            try {
                const originalSetState = window.React.Component.prototype.setState;
                window.React.Component.prototype.setState = function(updater, callback) {
                    const result = originalSetState.call(this, updater, callback);
                    
                    if (this.props && this.props.children && 
                        typeof this.props.children === 'string' && 
                        (this.props.children.includes('ученик') || this.props.children.includes('студент'))) {
                        console.log('Обнаружено изменение состояния компонента с данными ученика');
                        setTimeout(restorePageAfterUpdate, 300);
                    }
                    
                    return result;
                };
            } catch (e) {
                console.log('Не удалось перехватить React setState');
            }
        }
        
        document.addEventListener('click', function(e) {
            const target = e.target;
            const text = target.textContent.toLowerCase();
            const className = target.className.toLowerCase();
            const id = target.id.toLowerCase();
            const type = target.type.toLowerCase();
            
            console.log('Клик по элементу:', text, className, id, type);
            
            const isActionButton = text.includes('сохранить') || text.includes('save') || 
                                 text.includes('редактировать') || text.includes('edit') ||
                                 text.includes('обновить') || text.includes('update') ||
                                 text.includes('отправить') || text.includes('submit') ||
                                 text.includes('подтвердить') || text.includes('confirm') ||
                                 className.includes('save') || className.includes('edit') ||
                                 className.includes('update') || className.includes('submit') ||
                                 className.includes('btn-primary') || className.includes('btn-success') ||
                                 id.includes('save') || id.includes('edit') || id.includes('submit') ||
                                 type === 'submit';
            
            if (isActionButton) {
                console.log('Обнаружен клик по кнопке сохранения/редактирования:', text);
                setTimeout(restorePageAfterUpdate, 500);
            }
        });
        
        document.addEventListener('submit', function(e) {
            console.log('Обнаружена отправка формы:', e.target);
            setTimeout(restorePageAfterUpdate, 500);
        });
        
        document.addEventListener('input', function(e) {
            const target = e.target;
            const tagName = target.tagName.toLowerCase();
            const type = target.type.toLowerCase();
            
            if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
                if (type === 'text' || type === 'email' || type === 'number' || type === 'tel' || 
                    type === 'url' || type === 'search' || type === 'password' || type === '') {
                    
                    const isInForm = target.closest('form') !== null;
                    const isInTable = target.closest('table') !== null;
                    const isInEditableArea = target.closest('[contenteditable]') !== null;
                    
                    if (isInForm || isInTable || isInEditableArea) {
                        console.log('Обнаружено изменение в поле ввода:', target.name || target.id || target.className);
                        clearTimeout(window.inputTimeout);
                        window.inputTimeout = setTimeout(restorePageAfterUpdate, 1000);
                    }
                }
            }
        });
        
        document.addEventListener('input', function(e) {
            if (e.target.contentEditable === 'true') {
                console.log('Обнаружено изменение в contenteditable элементе');
                clearTimeout(window.inputTimeout);
                window.inputTimeout = setTimeout(restorePageAfterUpdate, 1000);
            }
        });
        
        document.addEventListener('blur', function(e) {
            const target = e.target;
            const tagName = target.tagName.toLowerCase();
            
            if (tagName === 'input' || tagName === 'textarea' || tagName === 'select' || 
                target.contentEditable === 'true') {
                
                const isInForm = target.closest('form') !== null;
                const isInTable = target.closest('table') !== null;
                
                if (isInForm || isInTable) {
                    console.log('Потеря фокуса в поле ввода:', target.name || target.id || target.className);
                    setTimeout(restorePageAfterUpdate, 300);
                }
            }
        }, true);
        
        document.addEventListener('change', function(e) {
            const target = e.target;
            const tagName = target.tagName.toLowerCase();
            
            if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
                const isInForm = target.closest('form') !== null;
                const isInTable = target.closest('table') !== null;
                
                if (isInForm || isInTable) {
                    console.log('Обнаружено изменение поля:', target.name || target.id || target.className);
                    setTimeout(restorePageAfterUpdate, 300);
                }
            }
        });
        
        console.log('Перехват обновлений данных настроен');
    }
    
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.action === "getCurrentPage") {
            const detectedPage = detectCurrentPage();
            sendResponse({
                currentPage: detectedPage,
                savedPage: currentPage
            });
        } else if (request.action === "testRestore") {
            console.log('Тестирование восстановления страницы...');
            restorePageAfterUpdate();
            sendResponse({success: true});
        } else if (request.action === "clearSavedPage") {
            console.log('Очистка сохраненной страницы...');
            clearSavedPage();
            sendResponse({success: true});
        }
    });
    
    function initialize() {
        console.log('Инициализация исправления страниц...');
        
        applyPaginationFix();
        interceptDataUpdates();
        
        const observer = new MutationObserver(function(mutations) {
            let shouldReapply = false;
            let shouldRestore = false;
            
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType === 1) {
                            const hasPagination = 
                                (node.querySelector && (
                                    node.querySelector('[data-pagination]') ||
                                    node.querySelector('.pagination') ||
                                    node.querySelector('[class*="pagination"]') ||
                                    node.querySelector('button')
                                )) ||
                                (node.tagName === 'BUTTON' && (
                                    /^\d+$/.test(node.textContent.trim()) ||
                                    node.textContent.includes('Следующая') ||
                                    node.textContent.includes('Предыдущая')
                                ));
                            
                            if (hasPagination) {
                                shouldReapply = true;
                            }
                            
                            const hasTableUpdate = 
                                (node.querySelector && (
                                    node.querySelector('table') ||
                                    node.querySelector('[class*="table"]') ||
                                    node.querySelector('[class*="row"]') ||
                                    node.querySelector('[class*="cell"]') ||
                                    node.querySelector('[class*="tr"]') ||
                                    node.querySelector('[class*="td"]') ||
                                    node.querySelector('tbody') ||
                                    node.querySelector('thead')
                                )) ||
                                (node.tagName === 'TABLE' || 
                                 node.tagName === 'TBODY' ||
                                 node.tagName === 'THEAD' ||
                                 node.tagName === 'TR' ||
                                 node.tagName === 'TD' ||
                                 (node.className && (
                                     node.className.includes('table') || 
                                     node.className.includes('row') ||
                                     node.className.includes('cell') ||
                                     node.className.includes('tr') ||
                                     node.className.includes('td')
                                 )));
                            
                            if (hasTableUpdate) {
                                console.log('Обнаружено обновление таблицы:', node.tagName, node.className);
                                shouldRestore = true;
                            }
                            
                            const hasFormUpdate = 
                                (node.querySelector && (
                                    node.querySelector('form') ||
                                    node.querySelector('input') ||
                                    node.querySelector('textarea') ||
                                    node.querySelector('select') ||
                                    node.querySelector('[contenteditable]')
                                )) ||
                                (node.tagName === 'FORM' ||
                                 node.tagName === 'INPUT' ||
                                 node.tagName === 'TEXTAREA' ||
                                 node.tagName === 'SELECT' ||
                                 node.contentEditable === 'true');
                            
                            if (hasFormUpdate) {
                                console.log('Обнаружено обновление формы/полей:', node.tagName, node.className);
                                shouldRestore = true;
                            }
                            
                            const hasModalUpdate = 
                                (node.querySelector && (
                                    node.querySelector('[class*="modal"]') ||
                                    node.querySelector('[class*="dialog"]') ||
                                    node.querySelector('[class*="popup"]') ||
                                    node.querySelector('[role="dialog"]') ||
                                    node.querySelector('[class*="overlay"]')
                                )) ||
                                (node.className && (
                                    node.className.includes('modal') ||
                                    node.className.includes('dialog') ||
                                    node.className.includes('popup') ||
                                    node.className.includes('overlay')
                                ));
                            
                            if (hasModalUpdate) {
                                console.log('Обнаружено обновление модального окна:', node.tagName, node.className);
                                shouldRestore = true;
                            }
                        }
                    });
                }
                
                if (mutation.type === 'attributes') {
                    const target = mutation.target;
                    const attributeName = mutation.attributeName;
                    
                    if (attributeName === 'class' || attributeName === 'style' || 
                        attributeName === 'data-state' || attributeName === 'aria-expanded') {
                        
                        const isInTable = target.closest('table') !== null;
                        const isInForm = target.closest('form') !== null;
                        const isButton = target.tagName === 'BUTTON';
                        const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';
                        
                        if (isInTable || isInForm || isButton || isInput) {
                            console.log('Обнаружено изменение атрибута:', attributeName, 'в элементе:', target.tagName, target.className);
                            shouldRestore = true;
                        }
                    }
                }
                
                if (mutation.type === 'characterData') {
                    const parent = mutation.target.parentNode;
                    if (parent && parent.nodeType === 1) {
                        const isInTable = parent.closest('table') !== null;
                        const isInForm = parent.closest('form') !== null;
                        
                        if (isInTable || isInForm) {
                            console.log('Обнаружено изменение текста в таблице/форме');
                            shouldRestore = true;
                        }
                    }
                }
            });
            
            if (shouldReapply) {
                console.log('DOM изменился, переприменяем исправление...');
                setTimeout(applyPaginationFix, 100);
            }
            
            if (shouldRestore) {
                console.log('Обнаружено обновление данных, восстанавливаем страницу...');
                setTimeout(restorePageAfterUpdate, 200);
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style', 'data-state', 'aria-expanded'],
            characterData: true
        });
        
        showNotification('Исправление страниц активно', 'Теперь при изменении данных ученика вы останетесь на текущей странице.');
        
        setInterval(function() {
            const buttons = findPaginationButtons();
            if (buttons.length > 0) {
                applyPaginationFix();
            }
        }, 2000);
        
        setInterval(function() {
            getSavedPage(function(savedPage) {
                if (savedPage > 1) {
                    const currentPage = detectCurrentPage();
                    if (currentPage === 1 && savedPage > 1) {
                        console.log('Периодическая проверка: обнаружен сброс на страницу 1, восстанавливаем...');
                        restorePageAfterUpdate();
                    }
                }
            });
        }, 3000);
        
        setTimeout(function() {
            console.log('Дополнительная проверка после загрузки...');
            applyPaginationFix();
            
            getSavedPage(function(savedPage) {
                if (savedPage > 1) {
                    const currentPage = detectCurrentPage();
                    if (currentPage === 1) {
                        console.log('Страница сбросилась после загрузки, восстанавливаем...');
                        restorePageAfterUpdate();
                    }
                }
            });
        }, 2000);
    }
    
    function showNotification(title, message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 15px;
            border-radius: 8px;
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            max-width: 350px;
            font-size: 14px;
            line-height: 1.4;
        `;
        notification.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 5px;">${title}</div>
            <div>${message}</div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(function() {
            if (notification.parentNode) {
                notification.style.opacity = '0';
                notification.style.transform = 'translateX(100%)';
                notification.style.transition = 'all 0.3s ease';
                setTimeout(function() {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, 5000);
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
    
    window.PaginationFix = {
        saveCurrentPage: saveCurrentPage,
        getSavedPage: getSavedPage,
        clearSavedPage: clearSavedPage,
        applyFix: applyPaginationFix,
        findButtons: findPaginationButtons,
        detectCurrentPage: detectCurrentPage,
        restorePage: restorePageAfterUpdate,
        testRestore: function() {
            console.log('Ручное тестирование восстановления...');
            restorePageAfterUpdate();
        },
        debugInfo: function() {
            console.log('Информация для отладки:');
            console.log('- Текущая страница:', detectCurrentPage());
            console.log('- Сохраненная страница:', currentPage);
            console.log('- Кнопки пагинации:', findPaginationButtons().length);
            console.log('- Элементы пагинации:', findPaginationElements().length);
        },
        forceRestore: function() {
            console.log('Принудительное восстановление...');
            isRestoring = false;
            restoreAttempts = 0;
            restorePageAfterUpdate();
        },
        monitorEvents: function() {
            console.log('Включено мониторинг событий...');
            window.debugMode = true;
        }
    };
    
})(); 