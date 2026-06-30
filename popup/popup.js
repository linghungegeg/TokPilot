/**
 * TikTok自动化助手 - 弹窗控制器
 */
class PopupController {
    constructor() {
        // 默认配置
        this.config = {
            autoReply: {
                enabled: false,
                message: '你好！感谢你的消息，我会尽快回复你的~',
                typingSpeed: 'normal'
            },
            autoFollow: {
                enabled: false,
                welcomeMessage: '你好！感谢关注，很高兴认识你！😊'
            },
            profileAssistant: {
                message: '你好！刚刚关注了你，很高兴认识你 😊'
            },
            searchAssistant: {
                keyword: ''
            },
            system: {
                checkInterval: 3000,
                actionDelay: 2000,
                debugMode: false,
                safeMode: true
            }
        };

        // 统计数据
        this.stats = {
            todayReplies: 0,
            todayFollows: 0,
            lastActiveTime: null,
            lastResetDate: new Date().toDateString()
        };

        this.userQueue = [];

        // DOM元素引用
        this.elements = {};
        
        this.init();
    }

    /**
     * 初始化PopupController
     */
    async init() {
        try {
            console.log('🚀 初始化TikTok自动化插件面板...');
            
            // 获取所有需要的元素
            this.getElements();
            this.setupEventListeners();
            
            // 初始化时加载配置和更新UI
            await this.loadConfig();
            this.updateUI();
            this.updateStatistics();
            this.checkDailyReset();
            this.startStatusMonitoring();
            
            console.log('✅ 插件面板初始化完成');
        } catch (error) {
            console.error('❌ 插件面板初始化失败:', error);
            // 显示错误信息但不阻止基本功能
            this.showNotification('插件初始化完成，部分功能可能受限', 'warning');
        }
    }

    /**
     * 获取页面元素（安全版本）
     */
    getElements() {
        try {
            // 开关元素
            this.autoReplyToggle = document.getElementById('autoReplyToggle');
            this.autoFollowToggle = document.getElementById('autoFollowToggle');
            
            // 配置元素
            this.replyMessage = document.getElementById('replyMessage');
            this.welcomeMessage = document.getElementById('welcomeMessage');
            this.searchKeyword = document.getElementById('searchKeyword');
            this.profileMessage = document.getElementById('profileMessage');
            this.checkInterval = document.getElementById('checkInterval');
            this.actionDelay = document.getElementById('actionDelay');
            this.debugMode = document.getElementById('debugMode');
            this.safeMode = document.getElementById('safeMode');
            
            // 按钮元素
            this.saveBtn = document.getElementById('saveBtn');
            this.testBtn = document.getElementById('testBtn');
            this.debugFollowBtn = document.getElementById('debugFollowBtn');
            this.searchCollectBtn = document.getElementById('searchCollectBtn');
            this.openNextPrepareBtn = document.getElementById('openNextPrepareBtn');
            this.sentNextPrepareBtn = document.getElementById('sentNextPrepareBtn');
            this.clearQueueBtn = document.getElementById('clearQueueBtn');
            this.resetStatsBtn = document.getElementById('resetStatsBtn');
            this.advancedBtn = document.getElementById('advancedBtn');
            this.checkHealthBtn = document.getElementById('checkHealthBtn');

            // 状态和统计元素
            this.autoReplyStatus = document.getElementById('autoReplyStatus');
            this.autoFollowStatus = document.getElementById('autoFollowStatus');
            this.todayReplies = document.getElementById('todayReplies');
            this.todayFollows = document.getElementById('todayFollows');
            this.totalProcessed = document.getElementById('totalProcessed');
            this.lastActiveTime = document.getElementById('lastActiveTime');
            this.queueCount = document.getElementById('queueCount');

            // 健康检查元素
            this.healthScoreEl = document.getElementById('healthScore');
            this.healthBarEl = document.getElementById('healthBar');
            this.healthStatusEl = document.getElementById('healthStatus');
            this.healthWarningsEl = document.getElementById('healthWarnings');
            this.healthTipsEl = document.getElementById('healthTips');
            this.healthSignalsEl = document.getElementById('healthSignals');

            // 检查关键元素是否存在
            const criticalElements = [
                'autoReplyToggle', 'autoFollowToggle', 
                'replyMessage', 'welcomeMessage'
            ];
            
            for (const elementName of criticalElements) {
                if (!this[elementName]) {
                    console.warn(`⚠️ 关键元素 ${elementName} 未找到`);
                }
            }
            
            console.log('✅ 页面元素获取完成');
        } catch (error) {
            console.error('❌ 获取页面元素失败:', error);
        }
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 功能开关事件
        this.autoReplyToggle?.addEventListener('change', async (e) => {
            await this.handleAutoReplyToggle(e.target.checked);
        });
        
        this.autoFollowToggle?.addEventListener('change', async (e) => {
            await this.handleAutoFollowToggle(e.target.checked);
        });

        // 配置输入事件
        this.replyMessage?.addEventListener('input', () => this.saveConfig());
        this.welcomeMessage?.addEventListener('input', () => this.saveConfig());
        this.searchKeyword?.addEventListener('input', () => this.saveConfig());
        this.profileMessage?.addEventListener('input', () => this.saveConfig());
        this.checkInterval?.addEventListener('change', () => this.saveConfig());
        this.actionDelay?.addEventListener('change', () => this.saveConfig());
        this.debugMode?.addEventListener('change', () => this.saveConfig());
        this.safeMode?.addEventListener('change', () => this.saveConfig());

        // 按钮事件
        this.saveBtn?.addEventListener('click', () => this.saveConfig());
        this.testBtn?.addEventListener('click', () => this.testPluginFunction());
        this.debugFollowBtn?.addEventListener('click', () => this.debugFollowBackFlow()); // 新增
        this.searchCollectBtn?.addEventListener('click', () => this.searchOrCollectUsers());
        this.openNextPrepareBtn?.addEventListener('click', () => this.openNextAndPrepare());
        this.sentNextPrepareBtn?.addEventListener('click', () => this.markSentAndPrepareNext());
        this.clearQueueBtn?.addEventListener('click', () => this.clearUserQueue());
        this.resetStatsBtn?.addEventListener('click', () => this.resetStatistics());
        this.advancedBtn?.addEventListener('click', () => this.openAdvancedSettings());
        this.checkHealthBtn?.addEventListener('click', () => this.checkAccountHealth());

        document.addEventListener('keydown', (event) => {
            if (event.altKey && event.key.toLowerCase() === 'n') {
                event.preventDefault();
                this.markSentAndPrepareNext();
            }
        });
    }

    /**
     * 向content script发送消息（优化版）
     */
    async sendMessageToContent(message) {
        try {
            console.log('📤 准备发送消息:', message);

            // 获取当前活动标签页
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab) {
                console.error('❌ 未找到活动标签页');
                return { success: false, error: '未找到活动标签页' };
            }

            console.log('🌐 当前标签页:', { 
                id: tab.id, 
                url: tab.url,
                title: tab.title 
            });

            // 检查URL是否为TikTok
            if (!tab.url || !tab.url.includes('tiktok.com')) {
                console.warn('⚠️ 当前页面不是TikTok:', tab.url);
                return { 
                    success: false, 
                    error: `当前页面不是TikTok: ${tab.url}` 
                };
            }

            // 首先尝试ping测试连接
            try {
                console.log('🏓 测试连接...');
                const pingResponse = await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
                console.log('📡 连接测试成功:', pingResponse);
            } catch (pingError) {
                console.warn('📡 连接测试失败，可能需要刷新页面:', pingError.message);
                
                // 尝试注入content script
                try {
                    await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        files: ['utils/logger.js', 'utils/simulator.js', 'core/content.js']
                    });
                    console.log('📝 Content script重新注入成功');
                    
                    // 等待脚本初始化
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (injectError) {
                    console.error('📝 Content script注入失败:', injectError);
                    return { 
                        success: false, 
                        error: '插件注入失败，请刷新页面后重试' 
                    };
                }
            }

            // 发送实际消息
            console.log('📨 发送消息到content script...');
            const response = await chrome.tabs.sendMessage(tab.id, {
                ...message,
                timestamp: Date.now()
            });

            console.log('📬 收到响应:', response);
            return response || { success: true };

        } catch (error) {
            console.error('❌ 发送消息失败:', error);
            
            // 提供更具体的错误信息
            let errorMessage = error.message;
            if (error.message.includes('Could not establish connection')) {
                errorMessage = '无法连接到页面脚本，请刷新TikTok页面后重试';
            } else if (error.message.includes('Extension context invalidated')) {
                errorMessage = '插件需要重新加载，请在扩展页面重新加载插件';
            } else if (error.message.includes('Cannot access contents of url')) {
                errorMessage = '无法访问页面内容，请确保在TikTok页面上';
            }

            return { 
                success: false, 
                error: errorMessage 
            };
        }
    }

    /**
     * 处理自动回复开关（优化版）
     */
    async handleAutoReplyToggle(enabled) {
        console.log('🔄 处理自动回复开关:', enabled);
        
        // 先保存配置
        this.config.autoReply.enabled = enabled;
        await this.saveConfig();

        // 更新UI状态
        this.updateStatusDisplay('autoReply', enabled);

        try {
            // 发送消息给content script
            const response = await this.sendMessageToContent({
                action: 'toggleAutoReply',
                enabled: enabled,
                message: this.config.autoReply.message,
                typingSpeed: this.config.autoReply.typingSpeed
            });

            if (response?.success) {
                this.showNotification(
                    enabled ? '✅ 自动回复已启动' : '❌ 自动回复已停止',
                    enabled ? 'success' : 'info'
                );
                console.log('✅ 自动回复切换成功');
            } else {
                throw new Error(response?.error || '操作失败');
            }

        } catch (error) {
            console.error('❌ 自动回复切换失败:', error);
            
            // 回滚状态
            this.autoReplyToggle.checked = !enabled;
            this.config.autoReply.enabled = !enabled;
            this.updateStatusDisplay('autoReply', !enabled);
            
            // 显示详细错误信息
            this.showNotification(`❌ 操作失败: ${error.message || error}`, 'error');
        }
    }

    /**
     * 处理自动关注开关（优化版）
     */
    async handleAutoFollowToggle(enabled) {
        console.log('🔄 处理自动关注开关:', enabled);
        
        // 先保存配置
        this.config.autoFollow.enabled = enabled;
        await this.saveConfig();

        // 更新UI状态
        this.updateStatusDisplay('autoFollow', enabled);

        try {
            // 发送消息给content script
            const response = await this.sendMessageToContent({
                action: 'toggleAutoFollow',
                enabled: enabled,
                welcomeMessage: this.config.autoFollow.welcomeMessage
            });

            if (response?.success) {
                this.showNotification(
                    enabled ? '✅ 自动关注已启动' : '❌ 自动关注已停止',
                    enabled ? 'success' : 'info'
                );
                console.log('✅ 自动关注切换成功');
            } else {
                throw new Error(response?.error || '操作失败');
            }

        } catch (error) {
            console.error('❌ 自动关注切换失败:', error);
            
            // 回滚状态
            this.autoFollowToggle.checked = !enabled;
            this.config.autoFollow.enabled = !enabled;
            this.updateStatusDisplay('autoFollow', !enabled);
            
            // 显示详细错误信息
            this.showNotification(`❌ 操作失败: ${error.message || error}`, 'error');
        }
    }

    /**
     * 更新状态显示
     */
    updateStatusDisplay(type, enabled) {
        const statusElement = this[type + 'Status'];
        if (!statusElement) return;
        
        const statusDot = statusElement.querySelector('.status-dot');
        const statusText = statusElement.querySelector('.status-text');
        
        if (statusDot && statusText) {
            if (enabled) {
                statusDot.className = 'status-dot active';
                statusText.textContent = '功能运行中';
            } else {
                statusDot.className = 'status-dot inactive';
                statusText.textContent = '功能已关闭';
            }
        }
    }

    /**
     * 保存配置到存储
     */
    async saveConfig() {
        try {
            // 从UI元素读取最新配置
            if (this.replyMessage) {
                this.config.autoReply.message = this.replyMessage.value;
            }
            if (this.welcomeMessage) {
                this.config.autoFollow.welcomeMessage = this.welcomeMessage.value;
            }
            if (this.searchKeyword) {
                this.config.searchAssistant.keyword = this.searchKeyword.value.trim();
            }
            if (this.profileMessage) {
                this.config.profileAssistant.message = this.profileMessage.value;
            }
            if (this.checkInterval) {
                this.config.system.checkInterval = parseInt(this.checkInterval.value);
            }
            if (this.actionDelay) {
                this.config.system.actionDelay = parseInt(this.actionDelay.value);
            }
            if (this.debugMode) {
                this.config.system.debugMode = this.debugMode.checked;
            }
            if (this.safeMode) {
                this.config.system.safeMode = this.safeMode.checked;
            }

            // 保存配置
            await chrome.storage.local.set({ 
                'tiktok-auto-config': this.config,
                'tiktok-auto-last-save': Date.now()
            });
            
            // 通知content script配置已更新
            this.sendMessageToContent({ 
                action: 'updateConfig', 
                config: this.config 
            });
            
            // 显示保存成功通知
            this.showNotification('✅ 配置已保存', 'success');
            console.log('✅ 配置已保存');
        } catch (error) {
            console.error('❌ 保存配置失败:', error);
        }
    }

    /**
     * 从存储加载配置
     */
    async loadConfig() {
        try {
            const result = await chrome.storage.local.get([
                'tiktok-auto-config',
                'tiktok-user-queue',
                'tiktok-auto-stats',
                'tiktok-auto-last-save'
            ]);
            
            // 加载配置
            if (result['tiktok-auto-config']) {
                this.config = { ...this.config, ...result['tiktok-auto-config'] };
            }
            
            // 加载统计数据
            if (result['tiktok-auto-stats']) {
                this.stats = { ...this.stats, ...result['tiktok-auto-stats'] };
            }

            if (Array.isArray(result['tiktok-user-queue'])) {
                this.userQueue = result['tiktok-user-queue'];
            }
            
            console.log('✅ 配置已加载', this.config);
        } catch (error) {
            console.error('❌ 加载配置失败:', error);
        }
    }

    /**
     * 更新UI显示
     */
    updateUI() {
        try {
            // 更新开关状态
            if (this.autoReplyToggle) {
                this.autoReplyToggle.checked = this.config.autoReply.enabled;
            }
            if (this.autoFollowToggle) {
                this.autoFollowToggle.checked = this.config.autoFollow.enabled;
            }
            
            // 更新消息内容
            if (this.replyMessage) {
                this.replyMessage.value = this.config.autoReply.message;
            }
            if (this.welcomeMessage) {
                this.welcomeMessage.value = this.config.autoFollow.welcomeMessage;
            }
            if (this.searchKeyword) {
                this.searchKeyword.value = this.config.searchAssistant?.keyword || '';
            }
            if (this.profileMessage) {
                this.profileMessage.value = this.config.profileAssistant?.message || '';
            }
            
            // 更新系统设置
            if (this.checkInterval) {
                this.checkInterval.value = this.config.system.checkInterval.toString();
            }
            if (this.actionDelay) {
                this.actionDelay.value = this.config.system.actionDelay.toString();
            }
            if (this.debugMode) {
                this.debugMode.checked = this.config.system.debugMode;
            }
            if (this.safeMode) {
                this.safeMode.checked = this.config.system.safeMode;
            }
            
            // 更新状态显示
            this.updateStatusDisplay('autoReply', this.config.autoReply.enabled);
            this.updateStatusDisplay('autoFollow', this.config.autoFollow.enabled);
            this.updateQueueDisplay();
            
            console.log('✅ UI已更新');
        } catch (error) {
            console.error('❌ UI更新失败:', error);
        }
    }

    /**
     * 更新统计显示
     */
    updateStatistics() {
        try {
            if (this.todayReplies) {
                this.todayReplies.textContent = this.stats.todayReplies || 0;
            }
            if (this.todayFollows) {
                this.todayFollows.textContent = this.stats.todayFollows || 0;
            }
            if (this.totalProcessed) {
                this.totalProcessed.textContent = (this.stats.todayReplies || 0) + (this.stats.todayFollows || 0);
            }
            if (this.lastActiveTime && this.stats.lastActiveTime) {
                this.lastActiveTime.textContent = new Date(this.stats.lastActiveTime).toLocaleTimeString();
            }
        } catch (error) {
            console.error('❌ 统计更新失败:', error);
        }
    }

    /**
     * 检查并重置每日统计
     */
    checkDailyReset() {
        const today = new Date().toDateString();
        if (this.stats.lastResetDate !== today) {
            this.stats = {
                todayReplies: 0,
                todayFollows: 0,
                lastActiveTime: null,
                lastResetDate: today
            };
            this.saveConfig();
            console.log('📅 每日统计已重置');
        }
    }

    /**
     * 重置统计数据
     */
    async resetStatistics() {
        this.stats = {
            todayReplies: 0,
            todayFollows: 0,
            lastActiveTime: null,
            lastResetDate: new Date().toDateString()
        };
        
        await chrome.storage.local.set({ 'tiktok-auto-stats': this.stats });
        this.updateStatistics();
        this.showNotification('统计数据已重置', 'success');
        console.log('�� 统计数据已重置');
    }

    /**
     * 测试插件功能（优化版）
     */
    async testPluginFunction() {
        console.log('🧪 开始测试插件功能...');
        
        this.testBtn.classList.add('loading');
        this.testBtn.innerHTML = '<span class="btn-icon">⏳</span>测试中...';
        
        try {
            const response = await this.sendMessageToContent({ action: 'testFunction' });
            
            console.log('🧪 测试响应:', response);

            if (response?.success) {
                const results = response.results;
                const summary = response.summary;
                
                console.log('📊 测试结果:', results);
                
                // 显示详细测试结果
                let message = `🧪 测试完成!\n${summary}`;
                
                if (results && results.pageValid) {
                    message += '\n✅ 页面验证通过';
                } else {
                    message += '\n❌ 页面验证失败';
                }

                this.showNotification(message, results?.pageValid ? 'success' : 'warning');
                
                // 在控制台显示详细结果
                console.table(results?.elementTests || {});
                
            } else {
                throw new Error(response?.error || '测试失败');
            }
            
        } catch (error) {
            console.error('❌ 测试失败:', error);
            this.showNotification(`❌ 测试失败: ${error.message || error}`, 'error');
        } finally {
            this.testBtn.classList.remove('loading');
            this.testBtn.innerHTML = '<span class="btn-icon">🧪</span>测试插件功能';
        }
    }

    /**
     * 调试回关流程（跳过小红点检测）
     */
    async debugFollowBackFlow() {
        try {
            // 显示启动提示
            this.showNotification('🎉 调试回关流程已启动！', 'info');
            console.log('🎉 调试回关流程已启动！');
            console.log('📋 执行步骤：1.检查页面 → 2.找通知项 → 3.回关用户 → 4.进入主页 → 5.发送消息');
            console.log('📍 请查看下方的详细执行日志...');
            
            const response = await this.sendMessageToContent({
                action: 'debugFollowFlow'
            });
            
            if (response?.success) {
                this.showNotification('🎉 调试回关流程执行成功！完整流程已完成', 'success');
                console.log('🎉 调试回关流程执行成功！');
                console.log('📋 请查看上方的详细执行日志了解每个步骤');
                console.log('✅ 完整流程：检查页面 → 找通知项 → 回关用户 → 进入主页 → 发送消息');
            } else {
                const errorMsg = response?.error || response?.message || '未知错误';
                this.showNotification(`❌ 调试执行失败: ${errorMsg}`, 'error');
                console.error('❌ 调试回关流程失败:', errorMsg);
                console.log('🔧 请检查：');
                console.log('1. 是否在TikTok通知页面 (https://www.tiktok.com/notifications)');
                console.log('2. 是否有新的关注通知');
                console.log('3. 网络连接是否正常');
            }
        } catch (error) {
            console.error('❌ 调试功能执行失败:', error);
            this.showNotification('❌ 调试功能执行失败，请刷新页面重试', 'error');
            console.log('🔧 故障排除建议：');
            console.log('1. 刷新TikTok页面');
            console.log('2. 重新加载插件');
            console.log('3. 检查控制台是否有其他错误信息');
        }
    }

    /**
     * 跳转到TikTok用户搜索页
     */
    async searchKeywordUsers() {
        try {
            await this.saveConfig();

            const keyword = this.config.searchAssistant.keyword;
            if (!keyword) {
                this.showNotification('请输入搜索关键词', 'warning');
                return;
            }

            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) {
                this.showNotification('未找到当前标签页', 'error');
                return;
            }

            const searchUrl = `https://www.tiktok.com/search/user?q=${encodeURIComponent(keyword)}`;
            await chrome.tabs.update(tab.id, { url: searchUrl });
            this.showNotification('已打开用户搜索页，页面加载后点“抓取用户”', 'success');
        } catch (error) {
            console.error('❌ 搜索跳转失败:', error);
            this.showNotification(`❌ 搜索失败: ${error.message || error}`, 'error');
        }
    }

    /**
     * 搜索并抓取：不在搜索页时先跳转，已在搜索页时抓取当前可见用户
     */
    async searchOrCollectUsers() {
        const button = this.searchCollectBtn;
        const originalText = button?.innerHTML;

        try {
            await this.saveConfig();

            if (button) {
                button.classList.add('loading');
                button.innerHTML = '<span class="btn-icon">⏳</span>处理中...';
            }

            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const keyword = this.config.searchAssistant.keyword;
            if (!keyword) {
                this.showNotification('请输入搜索关键词', 'warning');
                return;
            }

            const isSearchPage = tab?.url?.includes('tiktok.com/search/user') || tab?.url?.includes('tiktok.com/search');
            if (!isSearchPage) {
                await chrome.tabs.update(tab.id, { url: `https://www.tiktok.com/search/user?q=${encodeURIComponent(keyword)}` });
                this.showNotification('已打开搜索页，加载完成后再点一次“搜索并抓取”', 'success');
                return;
            }

            await this.collectVisibleUsers();
        } catch (error) {
            console.error('❌ 搜索并抓取失败:', error);
            this.showNotification(`❌ 搜索并抓取失败: ${error.message || error}`, 'error');
        } finally {
            if (button) {
                button.classList.remove('loading');
                button.innerHTML = originalText;
            }
        }
    }

    /**
     * 抓取当前搜索页可见用户到队列
     */
    async collectVisibleUsers() {
        try {
            let response = await this.sendMessageToContent({ action: 'collectVisibleUsers' });
            if (!response?.success && response?.error?.includes('未知操作')) {
                response = await this.collectVisibleUsersByScript();
            }

            if (!response?.success) {
                throw new Error(response?.error || '抓取失败');
            }

            const users = response.users || [];
            const existing = new Set(this.userQueue.map(user => user.url));
            let addedCount = 0;

            for (const user of users) {
                if (!user.url || existing.has(user.url)) continue;
                this.userQueue.push({
                    username: user.username || '',
                    displayName: user.displayName || '',
                    url: user.url
                });
                existing.add(user.url);
                addedCount++;
            }

            await this.saveUserQueue();
            this.showNotification(`已抓取 ${users.length} 个用户，新增 ${addedCount} 个`, 'success');
        } catch (error) {
            console.error('❌ 抓取用户失败:', error);
            this.showNotification(`❌ 抓取用户失败: ${error.message || error}`, 'error');
        }
    }

    /**
     * 兼容旧content script：直接在当前TikTok页抓取可见用户
     */
    async collectVisibleUsersByScript() {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id || !tab.url?.includes('tiktok.com')) {
            return { success: false, error: '请先打开TikTok搜索结果页' };
        }

        const [{ result }] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                const isVisible = (element) => {
                    const rect = element.getBoundingClientRect();
                    const style = window.getComputedStyle(element);
                    return rect.width > 0 &&
                        rect.height > 0 &&
                        style.visibility !== 'hidden' &&
                        style.display !== 'none';
                };

                const normalizeProfileUrl = (rawUrl) => {
                    try {
                        const url = new URL(rawUrl, window.location.origin);
                        const match = url.pathname.match(/^\/@([^/]+)/);
                        return match ? `${url.origin}/@${match[1]}` : null;
                    } catch (error) {
                        return null;
                    }
                };

                const extractUsername = (url) => {
                    const match = url.match(/\/@([^/?#]+)/);
                    return match ? `@${decodeURIComponent(match[1])}` : '';
                };

                const usersByUrl = new Map();
                document.querySelectorAll('a[href*="/@"]').forEach((link) => {
                    if (!isVisible(link)) return;

                    const url = normalizeProfileUrl(link.href);
                    if (!url) return;

                    const username = extractUsername(url);
                    if (!username) return;

                    const container = link.closest('div, li, article') || link;
                    const displayName = (container.textContent || link.textContent || '')
                        .split('\n')
                        .map(item => item.trim())
                        .filter(Boolean)
                        .find(item => item !== username && !item.includes('关注') && !item.includes('Follow')) || '';

                    usersByUrl.set(url, { username, displayName, url });
                });

                return Array.from(usersByUrl.values()).slice(0, 50);
            }
        });

        return { success: true, users: result || [] };
    }

    /**
     * 打开队列里的下一个用户主页
     */
    async openNextQueuedUser() {
        try {
            if (this.userQueue.length === 0) {
                this.showNotification('队列为空，请先抓取用户', 'warning');
                return;
            }

            const nextUser = this.userQueue.shift();
            await this.saveUserQueue();

            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) {
                this.showNotification('未找到当前标签页', 'error');
                return;
            }

            await chrome.tabs.update(tab.id, { url: nextUser.url });
            this.showNotification(`已打开：${nextUser.username || nextUser.url}`, 'success');
        } catch (error) {
            console.error('❌ 打开队列用户失败:', error);
            this.showNotification(`❌ 打开失败: ${error.message || error}`, 'error');
        }
    }

    /**
     * 打开队列下一个用户，并在页面加载后准备私信草稿
     */
    async openNextAndPrepare() {
        const button = this.openNextPrepareBtn;
        await this.openNextAndPrepareWithButton(button);
    }

    /**
     * 记录你已手动发送，然后处理下一个
     */
    async markSentAndPrepareNext() {
        const button = this.sentNextPrepareBtn;
        this.showNotification('已记录手动发送，准备下一位', 'info');
        await this.openNextAndPrepareWithButton(button);
    }

    async openNextAndPrepareWithButton(button) {
        const originalText = button?.innerHTML;

        try {
            if (this.userQueue.length === 0) {
                this.showNotification('队列为空，请先抓取用户', 'warning');
                return;
            }

            await this.saveConfig();

            if (button) {
                button.classList.add('loading');
                button.innerHTML = '<span class="btn-icon">⏳</span>处理中...';
            }

            const nextUser = this.userQueue.shift();
            await this.saveUserQueue();

            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab?.id) {
                this.showNotification('未找到当前标签页', 'error');
                return;
            }

            await chrome.tabs.update(tab.id, { url: nextUser.url });
            await this.waitForTabLoaded(tab.id);
            await new Promise(resolve => setTimeout(resolve, 2500));

            const response = await this.sendMessageToContent({
                action: 'prepareProfileMessage',
                shouldFollow: true,
                message: this.config.profileAssistant.message
            });

            if (response?.success) {
                this.showNotification(response.message || `已准备：${nextUser.username || nextUser.url}`, 'success');
            } else {
                throw new Error(response?.error || '准备私信失败');
            }
        } catch (error) {
            console.error('❌ 打开并准备失败:', error);
            this.showNotification(`❌ 打开并准备失败: ${error.message || error}`, 'error');
        } finally {
            if (button) {
                button.classList.remove('loading');
                button.innerHTML = originalText;
            }
        }
    }

    waitForTabLoaded(tabId) {
        return new Promise((resolve) => {
            const timeoutId = setTimeout(() => {
                chrome.tabs.onUpdated.removeListener(listener);
                resolve();
            }, 15000);

            const listener = (updatedTabId, changeInfo) => {
                if (updatedTabId === tabId && changeInfo.status === 'complete') {
                    clearTimeout(timeoutId);
                    chrome.tabs.onUpdated.removeListener(listener);
                    resolve();
                }
            };

            chrome.tabs.onUpdated.addListener(listener);
        });
    }

    /**
     * 清空用户队列
     */
    async clearUserQueue() {
        this.userQueue = [];
        await this.saveUserQueue();
        this.showNotification('用户队列已清空', 'success');
    }

    async saveUserQueue() {
        await chrome.storage.local.set({ 'tiktok-user-queue': this.userQueue });
        this.updateQueueDisplay();
    }

    updateQueueDisplay() {
        if (this.queueCount) {
            this.queueCount.textContent = this.userQueue.length;
        }
    }

    /**
     * 🩺 账号健康检查
     */
    async checkAccountHealth() {
        const button = this.checkHealthBtn;
        const originalText = button?.innerHTML;

        try {
            if (button) {
                button.classList.add('loading');
                button.innerHTML = '<span class="btn-icon">⏳</span>检测中...';
            }

            // 重置显示
            this.healthScoreEl.textContent = '--';
            this.healthScoreEl.className = 'health-badge health-loading';
            this.healthBarEl.style.width = '0%';
            this.healthStatusEl.textContent = '正在检测...';
            this.healthWarningsEl.innerHTML = '';
            this.healthTipsEl.innerHTML = '';
            this.healthSignalsEl.innerHTML = '';

            const response = await this.sendMessageToContent({ action: 'checkAccountHealth' });

            if (!response?.success) {
                throw new Error(response?.error || '检测失败，请确保在TikTok页面');
            }

            this.renderHealthResult(response);
        } catch (error) {
            console.error('❌ 健康检查失败:', error);
            this.healthScoreEl.textContent = '?';
            this.healthScoreEl.className = 'health-badge health-error';
            this.healthStatusEl.textContent = `检测失败: ${error.message || error}`;
            this.showNotification('❌ 健康检查失败，请在TikTok页面使用', 'error');
        } finally {
            if (button) {
                button.classList.remove('loading');
                button.innerHTML = originalText;
            }
        }
    }

    renderHealthResult(response) {
        const { health, videoRestriction, ssrUser } = response;
        const score = health.score ?? 0;

        // 分数徽章
        this.healthScoreEl.textContent = score;
        this.healthScoreEl.className = 'health-badge';
        if (score >= 80) this.healthScoreEl.classList.add('health-green');
        else if (score >= 60) this.healthScoreEl.classList.add('health-orange');
        else if (score >= 30) this.healthScoreEl.classList.add('health-red');
        else this.healthScoreEl.classList.add('health-critical');

        // 进度条
        this.healthBarEl.style.width = `${score}%`;
        this.healthBarEl.className = 'health-bar';
        if (score >= 80) this.healthBarEl.classList.add('bar-green');
        else if (score >= 60) this.healthBarEl.classList.add('bar-orange');
        else if (score >= 30) this.healthBarEl.classList.add('bar-red');
        else this.healthBarEl.classList.add('bar-critical');

        // 状态文本
        const statusMap = {
            healthy: '✅ 账号健康 — 可正常操作',
            caution: '⚠️ 需注意 — 建议降低频率',
            restricted: '🔴 已被部分限制 — 暂停操作24-48小时',
            shadowbanned: '🚫 严重疑似Shadowban — 停止操作至少7天'
        };
        this.healthStatusEl.textContent = statusMap[health.status] || health.status;

        // SSR用户信息
        if (ssrUser) {
            this.healthSignalsEl.innerHTML = `
                <div class="signal-row"><span>用户</span><span>@${ssrUser.uniqueId}</span></div>
                <div class="signal-row"><span>粉丝</span><span>${ssrUser.followerCount?.toLocaleString() || '0'}</span></div>
                <div class="signal-row"><span>关注</span><span>${ssrUser.followingCount?.toLocaleString() || '0'}</span></div>
                <div class="signal-row"><span>关注/粉丝比</span><span>${health.signals.followRatio ?? 'N/A'}</span></div>
                <div class="signal-row"><span>已认证</span><span>${ssrUser.verified ? '✅' : '否'}</span></div>
                ${videoRestriction?.isRestricted ? `<div class="signal-row signal-warn"><span>视频限制信号</span><span>${videoRestriction.signals.join(', ')}</span></div>` : ''}
            `;
        }

        // 警告
        if (health.warnings?.length) {
            this.healthWarningsEl.innerHTML = health.warnings
                .map(w => `<div class="warning-item">⚠️ ${w}</div>`)
                .join('');
        }

        // 养号建议
        if (health.tips?.length) {
            this.healthTipsEl.innerHTML = health.tips
                .slice(0, 3)
                .map(t => `<div class="tip-item">💡 ${t}</div>`)
                .join('');
        }

        this.showNotification(
            score >= 80 ? '✅ 账号健康，放心使用' :
            score >= 60 ? '⚠️ 账号需注意，慢点操作' :
            '🔴 账号受限，建议暂停操作',
            score >= 80 ? 'success' : score >= 60 ? 'warning' : 'error'
        );
    }

    /**
     * 打开高级设置
     */
    openAdvancedSettings() {
        // 这里可以打开一个新的页面或模态框来显示高级设置
        this.showNotification('🔧 高级设置功能开发中...', 'info');
    }

    /**
     * 启动状态监控
     */
    startStatusMonitoring() {
        // 每5秒更新一次统计数据
        setInterval(async () => {
            try {
                const result = await chrome.storage.local.get(['tiktok-auto-stats']);
                if (result['tiktok-auto-stats']) {
                    this.stats = { ...this.stats, ...result['tiktok-auto-stats'] };
                    this.updateStatistics();
                }
            } catch (error) {
                console.error('更新统计数据失败:', error);
            }
        }, 5000);
    }

    /**
     * 显示通知消息
     */
    showNotification(message, type = 'info') {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 16px;
            border-radius: 8px;
            color: white;
            font-size: 14px;
            font-weight: 500;
            z-index: 10000;
            max-width: 300px;
            word-wrap: break-word;
            animation: slideInRight 0.3s ease-out;
            ${type === 'success' ? 'background: #10b981;' : 
              type === 'error' ? 'background: #ef4444;' : 
              type === 'warning' ? 'background: #f59e0b;' :
              'background: #3b82f6;'}
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // 3秒后自动移除
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease-out';
                setTimeout(() => {
                    notification.remove();
                }, 300);
            }
        }, 3000);
    }
}

// 添加CSS动画
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// 当DOM加载完成后初始化弹窗控制器
document.addEventListener('DOMContentLoaded', () => {
    new PopupController();
}); 
