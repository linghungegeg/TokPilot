/**
 * TikTok自动化助手 - 核心内容脚本 (重建版)
 * @description 基于真实TikTok页面元素的自动化逻辑
 * @author 编程小白学习项目
 * @version 1.1.0 - 用户定制版
 */

class TikTokAutoCore {
    constructor() {
        // 初始化配置
        this.config = {
            autoReply: {
                enabled: false,
                message: '你好！感谢你的消息，我会尽快回复你的~',
                typingSpeed: 'normal'
            },
            autoFollow: {
                enabled: false,
                welcomeMessage: '感谢关注！✨ 欢迎来到我的TikTok，希望我的内容能带给你快乐~'
            },
            system: {
                checkInterval: 3000,
                actionDelay: 2000,
                debugMode: false,
                safeMode: true
            }
        };

        // 用户提供的实际元素选择器（最新版）
        // 注意: 带哈希的CSS类名会随TikTok构建变化, 建议通过 findElementByStrategies() 用多策略查找
        this.selectors = {
            // 小红点相关
            messageRedDot: '#app > div.css-420tiu-5e6d46e3--BaseBodyContainer.e1pgfmdu0 > div.css-1gx0soq-5e6d46e3--DivSideNavPlaceholderContainer.e9sj7gd0 > div > div.css-cmgz9h-5e6d46e3--DivScrollingContentContainer.e9sj7gd5 > div.css-1ymoeiy-5e6d46e3--DivMainNavContainer.e1s4651v4 > div:nth-child(7) > a > button > div > div.TUXButton-iconContainer > div > div > sup',

            notificationRedDot: '#app > div.css-420tiu-5e6d46e3--BaseBodyContainer.e1pgfmdu0 > div.css-1gx0soq-5e6d46e3--DivSideNavPlaceholderContainer.e9sj7gd0 > div > div.css-cmgz9h-5e6d46e3--DivScrollingContentContainer.e9sj7gd5 > div.css-1ymoeiy-5e6d46e3--DivMainNavContainer.e1s4651v4 > div:nth-child(8) > button > div > div.TUXButton-iconContainer > div > div > sup',

            messageRequestRedDot: '#app > div.css-420tiu-5e6d46e3--BaseBodyContainer.e1pgfmdu0 > div.css-1gx0soq-5e6d46e3--DivSideNavPlaceholderContainer.e9sj7gd0 > div > div.css-4rr31o-5e6d46e3--DivDrawerContainer.egvg9xw0.drawer-enter-done > div > div > div.css-1dnyi4p-5e6d46e3--DivListContent.e4y7s3r7 > div > div.css-1irj9zu-5e6d46e3--DivScrollWrapper.ekxmxqp2 > div.css-v7yzx3-5e6d46e3--DivRequestGroup.e1b2fwco0 > div.css-19pd79w-5e6d46e3--SpanNewMessage.ejfai8i2',

            userReplyRedDot: '#more-acton-icon-0 > div.css-19pd79w-5e6d46e3--SpanNewMessage.ejfai8i2',

            // 按钮和交互元素
            messageButton: 'div:nth-child(7) > a', // 私信按钮的父级
            notificationButton: 'div:nth-child(8) > button', // 通知按钮

            userNickname: '#more-acton-icon-0 > div > div.css-1nrosu1-5e6d46e3--DivInfoTextWrapper.ejfai8i8 > p.css-ncyd6r-5e6d46e3--PInfoNickname.ejfai8i9',

            acceptMessageRequest: '#main-content-messages > div > div.css-110thew-5e6d46e3--DivStrangerBox.e1imrc108 > div.css-inje1j-5e6d46e3--DivOperation.e1imrc1013 > div.css-1cll76l-5e6d46e3--DivItem.e1imrc1015',

            // 用户提供的最新选择器 - 新流程
            followBackButtonInNotification: '#header-inbox-list > ul:nth-child(2) > li > div > button', // 通知中的回关按钮
            userAvatarInNotification: '#header-inbox-list > ul:nth-child(2) > li > div > span > img', // 通知中的用户头像
            userNotificationItem: '#header-inbox-list > ul:nth-child(2) > li > div', // 通知中的消息框（整个通知项）

            // 个人主页选择器（主选择器可能过期，配合 findElementByStrategies 使用）
            followButtonOnProfile: '#main-content-others_homepage > div > div.ed8bszu14.css-1j8bzeg-5e6d46e3--DivShareLayoutHeader-5e6d46e3--StyledDivShareLayoutHeaderV2-5e6d46e3--CreatorPageHeader.eb6a5k82 > div.css-n42mkb-5e6d46e3--DivShareTitleContainer-5e6d46e3--CreatorPageHeaderShareContainer.ed8bszu15 > div.css-adn7ap-5e6d46e3--DivButtonPanelWrapper.e11c9bxt0 > div.TUXTooltip-reference > button', // 个人主页关注按钮
            sendMessageFromProfile: '#main-content-others_homepage > div > div.ed8bszu14.css-1j8bzeg-5e6d46e3--DivShareLayoutHeader-5e6d46e3--StyledDivShareLayoutHeaderV2-5e6d46e3--CreatorPageHeader.eb6a5k82 > div.css-n42mkb-5e6d46e3--DivShareTitleContainer-5e6d46e3--CreatorPageHeaderShareContainer.ed8bszu15 > div.css-adn7ap-5e6d46e3--DivButtonPanelWrapper.e11c9bxt0 > a > button', // 个人主页消息按钮
            chatInputBox: '#main-content-messages > div > div.css-1stx9t7-5e6d46e3--DivChatBottom.e1imrc100 > div.css-6fmtan-5e6d46e3--DivMessageInputAndSendButton.e1imrc101 > div > div.css-y13y08-5e6d46e3--DivEditorContainer.e1imrc102 > div > div.DraftEditor-root > div.DraftEditor-editorContainer > div > div > div > div', // 对话输入框

            // 废弃的选择器（保留兼容）
            userNameLink: '#header-inbox-list > ul:nth-child(2) > li > div > div > a', // 用户名链接
            followBackButton: '#header-inbox-list > ul:nth-child(2) > li > div > button',
            messageInput: '#placeholder-a99f2'
        };

        // 基于TikTok真实SSR数据提取的API端点（2026.06确认）
        this.apiEndpoints = {
            followUser:    '/api/commit/follow/user',
            sendMessage:   '/v1/message/send',
            diggItem:      '/api/commit/item/digg',
            publishComment:'/api/comment/publish',
            diggComment:   '/api/comment/digg',
            collectItem:   '/api/item/collect',
            updateProfile: '/api/update/profile',
            updateRelation:'/webcast/user/relation/update'
        };

        // 状态管理
        this.isRunning = false;
        this.processedElements = new Set();
        this.stats = {
            replyCount: 0,
            followCount: 0,
            messageCount: 0
        };

        // 工具实例
        this.logger = new TikTokLogger('TikTok-Core-V2');
        this.simulator = new HumanSimulator({
            safeMode: this.config.system.safeMode
        });

        // 定时器
        this.checkTimer = null;
        this.lastCheck = 0;

        this.init();
    }

    /**
     * 初始化核心功能
     */
    async init() {
        this.logger.info('🚀 TikTok自动化核心V2初始化中...');
        
        try {
            // 验证页面环境
            if (!this.isValidTikTokPage()) {
                this.logger.warn('当前页面不是有效的TikTok页面');
                return;
            }

            // 加载保存的配置
            await this.loadConfig();

            // 设置消息监听器
            this.setupMessageListener();

            // 监听页面变化
            this.setupPageObserver();

            // 注入页面样式
            this.injectStyles();

            // 显示初始化通知
            this.showPageNotification('🤖 TikTok自动化助手V2已激活', 'success');

            this.logger.info('✅ 核心功能初始化完成');
        } catch (error) {
            this.logger.error('❌ 初始化失败:', error);
        }
    }

    /**
     * 验证是否为有效的TikTok页面（优化版）
     */
    isValidTikTokPage() {
        // 多重验证方法
        const checks = {
            domain: window.location.hostname.includes('tiktok.com'),
            hasApp: !!document.querySelector('#app'),
            hasBaseContainer: !!document.querySelector('[class*="BaseBodyContainer"]'),
            hasTikTokElements: document.querySelectorAll('[class*="css-"], [data-e2e]').length > 0,
            urlPattern: /tiktok\.com/i.test(window.location.href)
        };
        
        this.logger.debug('页面验证详情:', { 
            url: window.location.href,
            domain: window.location.hostname,
            checks: checks,
            userAgent: navigator.userAgent.includes('Chrome')
        });
        
        // 任何一个主要条件满足即可
        const isValid = checks.domain && (checks.hasApp || checks.hasBaseContainer || checks.hasTikTokElements);
        
        if (!isValid) {
            this.logger.warn('页面验证失败:', checks);
        } else {
            this.logger.info('页面验证成功 ✅');
        }
        
        return isValid;
    }

    /**
     * 读取TikTok SSR注入的页面数据 (__UNIVERSAL_DATA_FOR_REHYDRATION__)
     * 可在页面加载后直接获取用户信息、统计数据等, 无需爬DOM
     * @returns {Object|null} 解析后的页面数据, 失败返回null
     */
    readSSRData() {
        try {
            const el = document.querySelector('#__UNIVERSAL_DATA_FOR_REHYDRATION__');
            if (!el || !el.textContent) return null;
            const data = JSON.parse(el.textContent);
            const scope = data?.__DEFAULT_SCOPE__ || {};
            return {
                appContext: scope['webapp.app-context'] || null,
                userData: scope['webapp.user-detail'] || null,
                raw: data
            };
        } catch (e) {
            this.logger.debug('读取SSR数据失败:', e.message);
            return null;
        }
    }

    /**
     * 从SSR数据中提取当前登录用户信息
     */
    getCurrentUserFromSSR() {
        const ssrData = this.readSSRData();
        if (!ssrData?.userData) return null;
        const u = ssrData.userData.userInfo?.user || {};
        const s = ssrData.userData.userInfo?.stats || {};
        return {
            uniqueId: u.uniqueId || '',
            nickname: u.nickname || '',
            secUid: u.secUid || '',
            userId: u.id || '',
            avatarLarger: u.avatarLarger || '',
            verified: !!u.verified,
            followerCount: s.followerCount || 0,
            followingCount: s.followingCount || 0,
            videoCount: s.videoCount || 0,
            heartCount: s.heartCount || 0
        };
    }

    /**
     * 通用元素查找器: 按策略优先级依次尝试, 返回第一个可见元素
     * @param {Array<{strategy:string, value:string}>} strategies - {strategy: 'css'|'data-e2e'|'aria-label'|'text'|'xpath', value: '...'}
     * @returns {Element|null}
     */
    findElementByStrategies(strategies) {
        for (const {strategy, value} of strategies) {
            try {
                let el = null;
                switch (strategy) {
                    case 'css':
                        el = document.querySelector(value);
                        break;
                    case 'data-e2e':
                        el = document.querySelector(`[data-e2e="${value}"]`);
                        break;
                    case 'aria-label':
                        el = document.querySelector(`[aria-label*="${value}"]`);
                        break;
                    case 'text':
                        el = Array.from(document.querySelectorAll('button, a, span, div'))
                            .find(e => e.textContent?.trim() === value && this.isElementVisible(e));
                        break;
                    case 'role':
                        el = document.querySelector(`[role="${value}"]`);
                        break;
                }
                if (el && this.isElementVisible(el)) {
                    this.logger.debug(`元素匹配: strategy=${strategy} value=${value}`);
                    return el;
                }
            } catch (e) { /* 跳过无效选择器 */ }
        }
        return null;
    }

    /**
     * 通过TikTok内部API调用 (内容脚本中fetch自带页面cookie)
     * @param {string} endpoint - API路径, 如 '/api/commit/follow/user'
     * @param {Object} body - POST body
     * @returns {Promise<Object>} {success, data, error}
     */
    async callTikTokAPI(endpoint, body = {}) {
        try {
            const url = `https://www.tiktok.com${endpoint}`;
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Secsdk-Csrf-Request': '1',
                    'X-Secsdk-Csrf-Version': '1.2.8'
                },
                credentials: 'include',
                body: JSON.stringify(body)
            });
            const data = await res.json();
            return { success: res.ok && (data.code === 0 || data.status_code === 0), data };
        } catch (e) {
            this.logger.error(`API调用失败 ${endpoint}:`, e.message);
            return { success: false, error: e.message };
        }
    }

    /**
     * 加载配置
     */

    /**
     * 🩺 账号健康检查 - 综合评估当前账号状态
     * 基于TikTok真实SSR数据 + DOM信号 + 风控指标
     * @returns {Object} {score, status, signals, warnings, tips}
     */
    checkAccountHealth() {
        const ssrData = this.readSSRData();
        const result = {
            score: 100,        // 综合健康分 0-100
            status: 'healthy', // healthy | caution | restricted | shadowbanned
            signals: {},       // 各维度信号
            warnings: [],      // 警告列表
            tips: []           // 养号建议
        };

        // === 维度1: SSR数据可用性 (10分) ===
        const hasSSR = !!(ssrData && ssrData.userData);
        result.signals.ssrAvailable = hasSSR;
        if (!hasSSR) {
            result.score -= 10;
            result.warnings.push('SSR数据不可用，可能页面加载异常或被限制');
        }

        // === 维度2: 当前页面状态 (15分) ===
        const url = window.location.href;
        const pageSignals = {
            isProfilePage: /\/@[\w.-]+/.test(url),
            isSearchPage: /\/search/.test(url),
            isNotificationPage: /\/notifications/.test(url),
            isMessagesPage: /\/messages/.test(url),
            isForYouPage: url === 'https://www.tiktok.com/' || /\/foryou/.test(url),
            hasCaptcha: !!document.querySelector('[class*="captcha"], [id*="captcha"]'),
            hasVerify: !!document.querySelector('[class*="verify"], [id*="verify"]'),
            has403: document.title?.includes('Access Denied') || document.body?.innerText?.includes('Access Denied')
        };
        result.signals.page = pageSignals;

        if (pageSignals.hasCaptcha || pageSignals.hasVerify) {
            result.score -= 30;
            result.warnings.push('检测到验证码/CAPTCHA，可能触发风控');
        }
        if (pageSignals.has403) {
            result.score -= 50;
            result.warnings.push('检测到403/Access Denied，IP或账号可能被限制');
        }

        // === 维度3: 账号资料完整性 (15分) ===
        const user = ssrData?.userData?.userInfo?.user;
        const stats = ssrData?.userData?.userInfo?.stats;
        const profileSignals = {
            hasAvatar: !!(user?.avatarLarger),
            hasBio: !!(user?.signature),
            hasNickname: !!(user?.nickname),
            isVerified: !!(user?.verified),
            followerCount: stats?.followerCount || 0,
            followingCount: stats?.followingCount || 0,
            videoCount: stats?.videoCount || 0
        };
        result.signals.profile = profileSignals;

        if (!profileSignals.hasAvatar) {
            result.score -= 5;
            result.tips.push('建议上传头像，提高账号可信度');
        }
        if (!profileSignals.hasBio) {
            result.score -= 3;
            result.tips.push('建议填写个人简介');
        }
        if (profileSignals.followerCount < 10 && profileSignals.videoCount === 0) {
            result.score -= 5;
            result.tips.push('新号建议先发布几个视频，积累基础粉丝再操作');
        }

        // === 维度4: 跟随比 (F/R ratio) (20分) ===
        const frRatio = profileSignals.followerCount > 0
            ? profileSignals.followingCount / profileSignals.followerCount
            : (profileSignals.followingCount > 0 ? 999 : 0);
        result.signals.followRatio = Math.round(frRatio * 100) / 100;

        if (frRatio > 10) {
            result.score -= 15;
            result.warnings.push(`关注/粉丝比异常 (${result.signals.followRatio}:1)，大量关注但粉丝少会触发风控`);
            result.tips.push('建议暂停关注操作，先提升粉丝数');
        } else if (frRatio > 5) {
            result.score -= 8;
            result.warnings.push(`关注/粉丝比偏高 (${result.signals.followRatio}:1)，建议降低关注频率`);
        }

        // === 维度5: 操作频率感知 (20分) ===
        const opFreqSignals = {
            recentFollows: this.stats?.todayFollows || 0,
            recentMessages: this.stats?.todayReplies || 0,
            lastActiveAge: this.stats?.lastActiveTime ? Date.now() - this.stats.lastActiveTime : Infinity
        };
        result.signals.operations = opFreqSignals;

        if (opFreqSignals.recentFollows > 50) {
            result.score -= 10;
            result.warnings.push(`今日关注已达 ${opFreqSignals.recentFollows}，建议每天不超过50个`);
            result.tips.push('关注操作建议分散到不同时段，避免集中操作');
        }
        if (opFreqSignals.recentMessages > 100) {
            result.score -= 10;
            result.warnings.push(`今日私信已达 ${opFreqSignals.recentMessages}，频繁私信可能触发限制`);
        }

        // === 维度6: 页面功能可用性 (20分) ===
        const funcSignals = {
            followBtnVisible: this.findProfileFollowButton() !== null,
            messageBtnVisible: false, // 在主页才检查
            searchInputVisible: !!document.querySelector('input[placeholder*="Search"], [data-e2e="search-box"]'),
            navMessagesVisible: !!document.querySelector('[data-e2e="nav-messages"], a[href*="/messages"]'),
            fypVideosVisible: document.querySelectorAll('[data-e2e="recommend-list"] > *, video').length > 0
        };

        if (window.location.href.includes('tiktok.com/@')) {
            funcSignals.messageBtnVisible = this.findProfileMessageButton() !== null;
        }
        result.signals.functions = funcSignals;

        if (!funcSignals.followBtnVisible && !funcSignals.messageBtnVisible) {
            result.score -= 10;
            result.warnings.push('当前主页未找到关注/私信按钮，可能对方设置了隐私限制');
        }
        if (!funcSignals.fypVideosVisible && pageSignals.isForYouPage) {
            result.score -= 15;
            result.warnings.push('FYP页面无视频加载，可能被限流或网络异常');
        }

        // === 综合判定 ===
        if (result.score >= 80) {
            result.status = 'healthy';
        } else if (result.score >= 60) {
            result.status = 'caution';
            result.tips.push('账号处于观察期，建议降低操作频率，增加正常浏览行为');
        } else if (result.score >= 30) {
            result.status = 'restricted';
            result.tips.push('账号可能已被部分限制，建议暂停自动化操作24-48小时');
        } else {
            result.status = 'shadowbanned';
            result.tips.push('严重疑似被限流/Shadowban，建议停止所有自动化操作至少7天');
        }

        return result;
    }

    /**
     * 检测当前页视频的阴影限制信号 (在视频详情页使用)
     * @returns {Object} {isRestricted, signals[]}
     */
    detectVideoRestrictionSignals() {
        const signals = [];
        const el = document.querySelector('#__UNIVERSAL_DATA_FOR_REHYDRATION__');
        if (!el) return { isRestricted: false, signals: [] };

        try {
            const data = JSON.parse(el.textContent);
            const itemList = data?.__DEFAULT_SCOPE__?.['webapp.item-detail']?.itemInfo?.itemStruct;
            if (!itemList) return { isRestricted: false, signals: [] };

            // 检查已知的阴影限制信号
            const checks = {
                isTakenDown: itemList.takeDown === true,
                hasWarning: !!itemList.warnInfo,
                divertedToPrivate: itemList.divertedToPrivate === true,
                isSecret: itemList.secret === true,
                isPrivateItem: itemList.privateItem === true,
                isReviewing: itemList.isReviewing === true,
                forFriendOnly: itemList.forFriend === true,
                indexDisabled: itemList.indexEnabled === false,
                commentDisabled: itemList.commentDisabled === true,
                duetDisabled: itemList.duetDisabled === true,
                stitchDisabled: itemList.stitchDisabled === true,
                downloadDisabled: itemList.downloadDisabled === true,
                shareDisabled: itemList.shareDisabled === true
            };

            for (const [key, val] of Object.entries(checks)) {
                if (val) signals.push(key);
            }

            return {
                isRestricted: signals.length > 0,
                signals,
                videoHealthScore: itemList.videoHealthScore ?? null
            };
        } catch (e) {
            return { isRestricted: false, signals: [], error: e.message };
        }
    }
    async loadConfig() {
        try {
            const result = await new Promise(resolve => {
                chrome.storage.local.get(['tiktokConfig'], resolve);
            });

            if (result.tiktokConfig) {
                this.config = { ...this.config, ...result.tiktokConfig };
                this.logger.debug('配置加载成功:', this.config);
            }
        } catch (error) {
            this.logger.error('加载配置失败:', error);
        }
    }

    /**
     * 设置消息监听器（优化版）
     */
    setupMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.logger.info('📨 收到消息:', {
                action: request.action,
                url: window.location.href,
                isValid: this.isValidTikTokPage()
            });

            // 立即发送响应确认收到消息
            const handleAsync = async () => {
                try {
                    switch (request.action) {
                        case 'toggleAutoReply':
                            await this.handleToggleAutoReply(request);
                            return { success: true, message: '自动回复切换成功' };

                        case 'toggleAutoFollow':
                            await this.handleToggleAutoFollow(request);
                            return { success: true, message: '自动关注切换成功' };

                        case 'updateConfig':
                            this.updateConfig(request.config);
                            return { success: true, message: '配置更新成功' };

                        case 'testFunction':
                            try {
                                const testResult = await this.testFunctionAsync();
                                sendResponse({ 
                                    success: true, 
                                    results: testResult.results,
                                    summary: testResult.summary
                                });
                            } catch (error) {
                                sendResponse({ success: false, error: error.message });
                            }
                            break;

                        case 'debugFollowFlow':
                            try {
                                this.logger.info('🔧 收到调试回关流程命令');
                                const result = await this.debugFollowBackFlow();
                                sendResponse({ success: result, message: result ? '调试流程执行成功' : '调试流程执行失败' });
                            } catch (error) {
                                this.logger.error('调试命令执行失败:', error);
                                sendResponse({ success: false, error: error.message });
                            }
                            break;

                        case 'prepareProfileMessage':
                            try {
                                const result = await this.prepareProfileMessageDraft(request);
                                sendResponse(result);
                            } catch (error) {
                                this.logger.error('准备主页私信失败:', error);
                                sendResponse({ success: false, error: error.message });
                            }
                            break;

                        case 'collectVisibleUsers':
                            try {
                                const users = this.collectVisibleUsersFromPage();
                                sendResponse({ success: true, users });
                            } catch (error) {
                                this.logger.error('抓取当前页用户失败:', error);
                                sendResponse({ success: false, error: error.message });
                            }
                            break;

                        case 'checkAccountHealth':
                            try {
                                const healthData = this.checkAccountHealth();
                                const videoRestriction = this.detectVideoRestrictionSignals();
                                const ssrUser = this.getCurrentUserFromSSR();
                                sendResponse({
                                    success: true,
                                    health: healthData,
                                    videoRestriction: videoRestriction,
                                    ssrUser: ssrUser
                                });
                            } catch (error) {
                                this.logger.error('账号健康检查失败:', error);
                                sendResponse({ success: false, error: error.message });
                            }
                            break;

                        case 'ping':
                            return { 
                                success: true, 
                                message: 'pong', 
                                timestamp: Date.now(),
                                url: window.location.href,
                                pageValid: this.isValidTikTokPage()
                            };

                        default:
                            return { success: false, error: '未知操作: ' + request.action };
                    }
                } catch (error) {
                    this.logger.error('处理消息失败:', error);
                    return { success: false, error: error.message };
                }
            };

            // 异步处理并发送响应
            handleAsync().then(sendResponse).catch(error => {
                this.logger.error('异步处理失败:', error);
                sendResponse({ success: false, error: error.message });
            });

            return true; // 保持消息通道开启
        });

        // 添加连接测试
        this.logger.info('📡 消息监听器已设置，正在测试连接...');
    }

    /**
     * 处理自动回复切换（简化版）
     */
    async handleToggleAutoReply(request) {
        try {
            this.logger.info('🔧 处理自动回复切换:', request.enabled);
            
            this.config.autoReply.enabled = request.enabled;
            this.config.autoReply.message = request.message;
            this.config.autoReply.typingSpeed = request.typingSpeed;

            if (request.enabled) {
                await this.startAutoReply();
                this.showPageNotification('✅ 自动回复已启动', 'success');
            } else {
                this.stopAutoReply();
                this.showPageNotification('❌ 自动回复已停止', 'info');
            }

            this.logger.info('✅ 自动回复切换完成');
        } catch (error) {
            this.logger.error('❌ 自动回复切换失败:', error);
            throw error;
        }
    }

    /**
     * 处理自动关注切换（简化版）
     */
    async handleToggleAutoFollow(request) {
        try {
            this.logger.info('🔧 处理自动关注切换:', request.enabled);
            
            this.config.autoFollow.enabled = request.enabled;
            this.config.autoFollow.welcomeMessage = request.welcomeMessage;

            if (request.enabled) {
                await this.startAutoFollow();
                this.showPageNotification('✅ 自动关注已启动', 'success');
            } else {
                this.stopAutoFollow();
                this.showPageNotification('❌ 自动关注已停止', 'info');
            }

            this.logger.info('✅ 自动关注切换完成');
        } catch (error) {
            this.logger.error('❌ 自动关注切换失败:', error);
            throw error;
        }
    }

    /**
     * 启动自动回复功能
     */
    async startAutoReply() {
        if (this.checkTimer) {
            clearInterval(this.checkTimer);
        }

        this.logger.info('🔄 启动自动回复监控...');
        
        // 立即执行一次检查
        await this.checkForNewMessages();
        
        // 设置定时检查
        this.checkTimer = setInterval(async () => {
            if (this.config.autoReply.enabled) {
                await this.checkForNewMessages();
            }
        }, this.config.system.checkInterval);
    }

    /**
     * 停止自动回复功能
     */
    stopAutoReply() {
        if (this.checkTimer) {
            clearInterval(this.checkTimer);
            this.checkTimer = null;
        }
        this.logger.info('⏹️ 自动回复监控已停止');
    }

    /**
     * 启动自动关注功能
     */
    async startAutoFollow() {
        this.logger.info('🔄 启动自动关注监控...');
        
        // 设置定时检查通知
        setInterval(async () => {
            if (this.config.autoFollow.enabled) {
                await this.checkForNewFollowers();
            }
        }, this.config.system.checkInterval * 2); // 关注检查频率可以低一些
    }

    /**
     * 停止自动关注功能
     */
    stopAutoFollow() {
        this.logger.info('⏹️ 自动关注监控已停止');
    }

    /**
     * 检查新消息（使用用户提供的选择器）
     */
    async checkForNewMessages() {
        try {
            this.logger.debug('🔍 检查新消息...');

            // 检查私信小红点
            const messageRedDot = document.querySelector(this.selectors.messageRedDot);
            if (messageRedDot) {
                this.logger.info('发现私信小红点，开始处理...');
                await this.handlePrivateMessage();
                return;
            }

            // 检查消息请求小红点
            const requestRedDot = document.querySelector(this.selectors.messageRequestRedDot);
            if (requestRedDot) {
                this.logger.info('发现消息请求小红点，开始处理...');
                await this.handleMessageRequest();
                return;
            }

            // 检查用户回复小红点
            const userReplyRedDot = document.querySelector(this.selectors.userReplyRedDot);
            if (userReplyRedDot) {
                this.logger.info('发现用户回复小红点，开始处理...');
                await this.handleUserReply();
                return;
            }

            this.logger.debug('未发现新消息');
        } catch (error) {
            this.logger.error('检查新消息时出错:', error);
        }
    }

    /**
     * 处理私信消息
     */
    async handlePrivateMessage() {
        try {
            this.logger.info('🎯 处理私信消息...');

            // 1. 点击私信按钮进入消息界面
            const messageButton = document.querySelector(this.selectors.messageButton);
            if (!messageButton) {
                this.logger.error('未找到私信按钮');
                return false;
            }

            await this.simulator.simulateRealClick(messageButton);
            await this.simulator.humanDelay();

            // 2. 等待页面加载，然后处理具体的消息
            await this.processMessagesInList();

            this.logger.info('✅ 私信消息处理完成');
        } catch (error) {
            this.logger.error('处理私信消息失败:', error);
        }
    }

    /**
     * 处理消息请求（陌生人消息需要同意）
     */
    async handleMessageRequest() {
        try {
            this.logger.info('📬 处理消息请求...');

            // 1. 点击消息请求红点或相关区域
            const requestRedDot = document.querySelector(this.selectors.messageRequestRedDot);
            if (requestRedDot) {
                await this.simulator.simulateRealClick(requestRedDot);
                await this.simulator.randomDelay(1000, 2000);
            }

            // 2. 查找并点击接受消息请求按钮
            const acceptButton = document.querySelector(this.selectors.acceptMessageRequest);
            if (acceptButton) {
                this.logger.info('找到接受消息请求按钮，准备点击...');
                await this.simulator.simulateRealClick(acceptButton);
                await this.simulator.humanDelay();

                // 3. 接受请求后，发送自动回复
                await this.sendAutoReply();
                
                this.updateStats('reply');
                this.logger.info('✅ 消息请求已接受并回复');
            } else {
                this.logger.warn('未找到接受消息请求按钮');
            }
        } catch (error) {
            this.logger.error('处理消息请求失败:', error);
        }
    }

    /**
     * 处理用户回复
     */
    async handleUserReply() {
        try {
            this.logger.info('💬 处理用户回复...');

            // 1. 点击用户昵称进入对话
            const userNickname = document.querySelector(this.selectors.userNickname);
            if (userNickname) {
                await this.simulator.simulateRealClick(userNickname);
                await this.simulator.randomDelay(1000, 2000);

                // 2. 发送自动回复
                await this.sendAutoReply();
                
                this.updateStats('reply');
                this.logger.info('✅ 用户回复处理完成');
            } else {
                this.logger.warn('未找到用户昵称元素');
            }
        } catch (error) {
            this.logger.error('处理用户回复失败:', error);
        }
    }

    /**
     * 处理消息列表中的多个消息
     */
    async processMessagesInList() {
        try {
            // 查找所有有红点的消息项
            const messageItems = document.querySelectorAll('[class*="NewMessage"], [class*="unread"]');
            
            this.logger.info(`找到 ${messageItems.length} 个未读消息项`);

            for (const item of messageItems) {
                if (this.processedElements.has(item)) continue;

                await this.simulator.simulateRealClick(item);
                await this.simulator.randomDelay(1500, 2500);

                // 检查是否需要接受消息请求
                const acceptButton = document.querySelector(this.selectors.acceptMessageRequest);
                if (acceptButton) {
                    await this.simulator.simulateRealClick(acceptButton);
                    await this.simulator.randomDelay(1000, 1500);
                }

                // 发送回复
                await this.sendAutoReply();
                
                this.processedElements.add(item);
                this.updateStats('reply');

                // 人性化延时
                await this.simulator.humanDelay();
            }
        } catch (error) {
            this.logger.error('处理消息列表失败:', error);
        }
    }

    /**
     * 发送自动回复
     */
    async sendAutoReply() {
        try {
            // 等待输入框加载
            await this.simulator.randomDelay(1000, 1500);

            // 查找输入框
            let inputElement = document.querySelector(this.selectors.messageInput);
            
            // 如果主要输入框没找到，尝试其他可能的输入框选择器
            if (!inputElement) {
                const fallbackSelectors = [
                    'textarea[placeholder*="消息"]',
                    'input[placeholder*="消息"]',
                    'div[contenteditable="true"]',
                    'textarea[data-testid*="input"]',
                    '[role="textbox"]'
                ];

                for (const selector of fallbackSelectors) {
                    inputElement = document.querySelector(selector);
                    if (inputElement) {
                        this.logger.debug(`使用备选输入框: ${selector}`);
                        break;
                    }
                }
            }

            if (!inputElement) {
                this.logger.error('未找到消息输入框');
                return false;
            }

            // 模拟打字输入回复消息
            const success = await this.simulator.simulateTyping(
                inputElement,
                this.config.autoReply.message,
                this.config.autoReply.typingSpeed
            );

            if (!success) {
                this.logger.error('输入消息失败');
                return false;
            }

            // 等待打字完成
            await this.simulator.randomDelay(500, 1000);

            // 按Enter发送消息
            await this.simulator.simulateEnterKey(inputElement);

            this.logger.info('✅ 自动回复发送成功');
            return true;
        } catch (error) {
            this.logger.error('发送自动回复失败:', error);
            return false;
        }
    }

    /**
     * 检查新关注者
     */
    async checkForNewFollowers() {
        try {
            this.logger.debug('🔍 检查新关注者...');

            // 检查通知小红点
            const notificationRedDot = document.querySelector(this.selectors.notificationRedDot);
            if (!notificationRedDot) {
                this.logger.debug('未发现通知小红点');
                return;
            }

            this.logger.info('发现通知小红点，检查关注者...');

            // 点击通知按钮
            const notificationButton = document.querySelector(this.selectors.notificationButton);
            if (notificationButton) {
                await this.simulator.simulateRealClick(notificationButton);
                await this.simulator.randomDelay(2000, 3000);

                // 查找并点击关注按钮
                await this.handleFollowBack();
            }
        } catch (error) {
            this.logger.error('检查新关注者失败:', error);
        }
    }

    /**
     * 处理回关（仅限通知页面版本）
     */
    async handleFollowBack() {
        try {
            // 检查当前是否在通知页面
            if (!this.isOnNotificationPage()) {
                this.logger.debug('⚠️ 不在通知页面，跳过回关检查');
                return;
            }

            this.logger.info('👥 开始处理回关流程（仅限通知页面）...');

            // 策略1：使用通用按钮文本匹配（最可靠）
            const followBackSuccess1 = await this.findAndClickFollowButtonsByText();
            if (followBackSuccess1) return;

            // 策略2：使用页面结构分析
            const followBackSuccess2 = await this.findAndClickFollowButtonsByStructure();
            if (followBackSuccess2) return;

            // 策略3：使用CSS选择器组合
            const followBackSuccess3 = await this.findAndClickFollowButtonsByCssSelectors();
            if (followBackSuccess3) return;

            this.logger.debug('⚠️ 在通知页面未找到可回关的按钮');

        } catch (error) {
            this.logger.error('处理回关失败:', error);
        }
    }

    /**
     * 检查是否在通知页面（修复版）
     */
    isOnNotificationPage() {
        // 检查URL是否包含通知相关路径
        const url = window.location.href;
        const isNotificationUrl = url.includes('/notifications') || url.includes('/activity');
        
        // 检查页面是否有通知相关元素
        const hasNotificationElements = (
            document.querySelector('h1[data-e2e="notification-header"]') ||
            document.querySelector('.notification-page') ||
            document.querySelector('#header-inbox-list') ||
            // 检查通知相关文本
            this.findElementsByText('h1', '通知').length > 0 ||
            this.findElementsByText('button', '粉丝').length > 0 ||
            this.findElementsByText('button', '所有活动').length > 0 ||
            this.findElementsByText('div', '关注了你').length > 0 ||
            this.findElementsByText('div', '粉丝').length > 0
        );

        const isOnNotificationPage = isNotificationUrl || hasNotificationElements;
        this.logger.debug(`页面检查 - URL: ${url}, 是否通知页面: ${isOnNotificationPage}`);
        
        return isOnNotificationPage;
    }

    /**
     * 安全的文本内容检查（替代:contains伪选择器）
     */
    findElementsByText(selector, text) {
        const elements = document.querySelectorAll(selector);
        return Array.from(elements).filter(el => 
            el.textContent && el.textContent.includes(text)
        );
    }

    /**
     * 策略1：新流程 - 回关按钮→头像点击→发消息（避免链接问题）
     */
    async findAndClickFollowButtonsByText() {
        try {
            this.logger.debug('🎯 策略1：新流程 - 回关按钮→头像→发消息...');

            // 限制搜索范围到通知相关容器
            const notificationContainers = [
                '#header-inbox-list',
                '[data-e2e="notification-list"]',
                '.notification-container',
                '.activity-list'
            ];

            let searchContainer = document;
            for (const selector of notificationContainers) {
                const container = document.querySelector(selector);
                if (container) {
                    searchContainer = container;
                    this.logger.debug(`限制搜索范围到: ${selector}`);
                    break;
                }
            }

            // 查找所有通知项
            const notificationItems = searchContainer.querySelectorAll('#header-inbox-list > ul:nth-child(2) > li');
            this.logger.info(`📊 找到 ${notificationItems.length} 个通知项`);

            if (notificationItems.length === 0) {
                return false;
            }

            // 处理每个通知项
            let processedCount = 0;
            for (const item of notificationItems) {
                if (this.processedElements.has(item)) continue;

                // 检查是否是关注类型的通知
                const itemText = item.textContent || '';
                if (!itemText.includes('关注了你') && !itemText.includes('followed you')) {
                    continue;
                }

                // 执行新流程：回关→头像→发消息
                const success = await this.processNotificationItemNew(item);
                if (success) {
                    processedCount++;
                }

                // 标记为已处理
                this.processedElements.add(item);
                this.updateStats('follow');

                // 人性化延时
                await this.simulator.humanDelay();
            }

            return processedCount > 0;

        } catch (error) {
            this.logger.error('策略1失败:', error);
            return false;
        }
    }

    /**
     * 处理单个通知项的新流程
     */
    async processNotificationItemNew(notificationItem) {
        try {
            // 获取用户信息
            const userName = this.extractUserNameFromNotification(notificationItem);
            if (!userName) {
                this.logger.warn('无法从通知项中提取用户名');
                return false;
            }

            this.logger.info(`🎯 开始处理用户: ${userName} (新流程)`);

            // 第一步：点击回关按钮
            const followSuccess = await this.clickFollowButtonInNotification(notificationItem, userName);
            if (followSuccess === 'already_friends') {
                this.logger.info(`🎉 ${userName} 已经是好友，跳过回关和发送消息`);
                return true; // 视为成功，但跳过后续流程
            }
            if (!followSuccess) {
                this.logger.warn(`回关 ${userName} 失败`);
                return false;
            }

            // 第二步：点击头像进入个人主页
            const navigationSuccess = await this.clickAvatarToProfile(notificationItem, userName);
            if (!navigationSuccess) {
                this.logger.warn(`无法通过头像进入 ${userName} 的个人主页`);
                return true; // 回关成功了，即使进不了主页也算成功
            }

            // 第三步：发送问候消息
            this.logger.info(`💬 向 ${userName} 发送问候消息...`);
            const messageSuccess = await this.sendGreetingOnProfile(userName);
            
            if (messageSuccess) {
                this.logger.info(`✅ 完整流程完成: ${userName} - 回关 + 问候消息`);
                return true;
            } else {
                this.logger.info(`✅ 回关成功，但向 ${userName} 发送消息失败`);
                return true; // 回关成功就算成功
            }

        } catch (error) {
            this.logger.error('处理通知项失败:', error);
            return false;
        }
    }

    /**
     * 从通知项中提取用户名
     */
    extractUserNameFromNotification(notificationItem) {
        try {
            // 尝试从多个可能的位置获取用户名
            const selectors = [
                'div > div > a', // 用户名链接
                'span img[alt]', // 头像的alt属性
                'img[alt]', // 头像的alt属性
                'a[href*="@"]' // 包含@的链接
            ];

            for (const selector of selectors) {
                const element = notificationItem.querySelector(selector);
                if (element) {
                    if (element.tagName === 'IMG' && element.alt) {
                        return element.alt;
                    } else if (element.href && element.href.includes('@')) {
                        const match = element.href.match(/@([^/?]+)/);
                        if (match) return match[1];
                    } else if (element.textContent) {
                        return element.textContent.trim();
                    }
                }
            }

            // 兜底：从通知文本中提取
            const notificationText = notificationItem.textContent || '';
            const lines = notificationText.split('\n').filter(line => line.trim());
            for (const line of lines) {
                if (line && !line.includes('关注了你') && !line.includes('分钟前') && !line.includes('小时前') && !line.includes('天前')) {
                    return line.trim();
                }
            }

            return null;
        } catch (error) {
            this.logger.error('提取用户名失败:', error);
            return null;
        }
    }

    /**
     * 点击通知项中的回关按钮 - 增强验证版
     */
    async clickFollowButtonInNotification(notificationItem, userName) {
        try {
            this.logger.info(`💝 开始回关 ${userName}...`);

            // 在通知项中查找回关按钮
            const followButton = notificationItem.querySelector('div > button');
            
            if (!followButton) {
                this.logger.warn('未找到通知项中的回关按钮');
                return false;
            }

            // 检查初始按钮文本
            const initialButtonText = followButton.textContent?.trim();
            this.logger.debug(`回关按钮初始文本: "${initialButtonText}"`);

            // 检查是否已经是好友状态
            const alreadyFriendsTexts = ['好友', 'Friends', 'Following', '已关注', '已经关注', 'Followed'];
            const needFollowBackTexts = ['回关', 'Follow Back', '关注', 'Follow'];

            if (!initialButtonText) {
                this.logger.warn('按钮文本为空');
                return false;
            }

            // 如果已经是好友，跳过这个用户
            if (alreadyFriendsTexts.some(text => initialButtonText.includes(text))) {
                this.logger.info(`✅ ${userName} 已经是好友 ("${initialButtonText}")，跳过回关操作`);
                return 'already_friends'; // 返回特殊值表示已经是好友
            }

            // 如果不是需要回关的按钮，返回失败
            if (!needFollowBackTexts.some(text => initialButtonText.includes(text))) {
                this.logger.warn('按钮不是回关按钮，当前文本:', initialButtonText);
                return false;
            }

            // 检查按钮是否可点击
            if (followButton.disabled) {
                this.logger.warn('回关按钮已禁用');
                return false;
            }

            // 安全检查：确保按钮在正确的通知项中
            const buttonRect = followButton.getBoundingClientRect();
            const itemRect = notificationItem.getBoundingClientRect();
            
            if (buttonRect.top < itemRect.top || 
                buttonRect.bottom > itemRect.bottom ||
                buttonRect.left < itemRect.left || 
                buttonRect.right > itemRect.right) {
                this.logger.warn('⚠️ 回关按钮不在当前通知项范围内，跳过以避免误操作');
                return false;
            }

            this.logger.info(`🎯 点击回关按钮 (${userName})...`);
            
            // 使用智能点击方法 - 自动处理不可点击的情况
            const clickSuccess = await this.simulator.smartClick(followButton, { 
                allowParentClick: false // 禁止点击父元素，避免误操作
            });
            
            if (!clickSuccess) {
                this.logger.error(`❌ 无法点击回关按钮: ${userName}`);
                return false;
            }
            
            // 等待按钮状态变化 - 分阶段验证
            this.logger.debug('⏳ 等待回关操作完成...');
            
            let verificationAttempts = 0;
            let isSuccessful = false;
            const maxVerificationAttempts = 8; // 最多验证8次，总共约16秒
            
            while (verificationAttempts < maxVerificationAttempts && !isSuccessful) {
                await this.simulator.randomDelay(2000, 2500); // 每次等待2-2.5秒
                verificationAttempts++;
                
                // 重新获取按钮文本
                const currentButtonText = followButton.textContent?.trim();
                this.logger.debug(`验证 ${verificationAttempts}/${maxVerificationAttempts}: 按钮文本 = "${currentButtonText}"`);
                
                // 检查按钮文本是否变成了"好友"或"Following"
                if (currentButtonText && (
                    currentButtonText.includes('好友') || 
                    currentButtonText.includes('Following') ||
                    currentButtonText.includes('已关注') ||
                    currentButtonText === '好友' ||
                    currentButtonText === 'Friends'
                )) {
                    this.logger.info(`🎉 回关成功验证: 按钮文本变为 "${currentButtonText}"`);
                    isSuccessful = true;
                    break;
                }
                
                // 检查按钮是否被禁用（有些时候按钮会被禁用表示操作正在进行）
                if (followButton.disabled) {
                    this.logger.debug(`按钮已禁用，可能正在处理请求...`);
                    continue; // 继续等待
                }
                
                // 如果按钮文本仍然是"回关"，可能需要重新点击
                if (currentButtonText && (currentButtonText.includes('回关') || currentButtonText.includes('Follow'))) {
                    if (verificationAttempts >= 3) { // 等待3次后如果还是"回关"，尝试重新点击
                        this.logger.warn(`⚠️ 第${verificationAttempts}次验证：按钮仍显示"${currentButtonText}"，尝试重新点击...`);
                        // 使用强制点击方法重试
                        await this.simulator.forceClick(followButton);
                    }
                }
                
                this.logger.debug(`第 ${verificationAttempts} 次验证未成功，继续等待...`);
            }
            
            if (isSuccessful) {
                this.logger.info(`✅ ${userName} 回关操作成功完成！`);
                
                // 统计更新
                if (this.stats) {
                    this.stats.todayFollows = (this.stats.todayFollows || 0) + 1;
                    this.stats.lastActiveTime = Date.now();
                }
                
                return true;
            } else {
                // 最后一次检查
                const finalButtonText = followButton.textContent?.trim();
                this.logger.error(`❌ 回关验证失败: ${userName}`);
                this.logger.error(`最终按钮文本: "${finalButtonText}"`);
                this.logger.error(`预期: "好友"、"Following"、"已关注" 等`);
                this.logger.error(`实际: "${finalButtonText}"`);
                
                // 即使验证失败，如果按钮文本确实变了，也可能是成功的
                if (finalButtonText !== initialButtonText) {
                    this.logger.warn(`⚠️ 按钮文本发生了变化，可能已经成功: "${initialButtonText}" → "${finalButtonText}"`);
                    return true;
                }
                
                return false;
            }

        } catch (error) {
            this.logger.error('点击回关按钮过程中出现错误:', error);
            return false;
        }
    }

    /**
     * 点击头像进入个人主页 - 增强版
     */
    async clickAvatarToProfile(notificationItem, userName) {
        try {
            this.logger.info(`👤 尝试进入 ${userName} 的个人主页...`);
            
            // 🔧 增强调试：详细记录用户名和元素信息
            this.logger.info(`🔍 调试信息：用户名="${userName}", 长度=${userName?.length}`);
            if (!userName || userName.length === 0) {
                this.logger.error('❌ 用户名为空！请检查用户名提取逻辑');
                return false;
            }

            // 记录当前URL
            const beforeClickUrl = window.location.href;
            this.logger.debug(`操作前URL: ${beforeClickUrl}`);

            let clickTarget = null;
            let clickSuccess = false;
            
            // 🔍 首先分析通知项的结构
            this.logger.debug('🔍 分析通知项结构...');
            const allImages = notificationItem.querySelectorAll('img');
            const allLinks = notificationItem.querySelectorAll('a');
            const allClickables = notificationItem.querySelectorAll('[onclick], [role="button"], [tabindex]');
            
            this.logger.debug(`发现 ${allImages.length} 个图片, ${allLinks.length} 个链接, ${allClickables.length} 个可点击元素`);

            // 🎯 策略1: 智能识别用户名区域
            this.logger.info('🎯 策略1: 智能识别用户名区域...');
            try {
                // 查找包含用户名的所有元素
                const textElements = notificationItem.querySelectorAll('*');
                for (const element of textElements) {
                    const text = element.textContent?.trim();
                    if (text && text === userName) {
                        // 找到用户名，查找其父级中的链接
                        let parentElement = element.parentElement;
                        let maxLevels = 5; // 最多向上查找5级
                        
                        while (parentElement && maxLevels > 0) {
                            const parentLinks = parentElement.querySelectorAll('a');
                            for (const link of parentLinks) {
                                if (link.href && (link.href.includes('@') || link.href.includes('/user/'))) {
                                    clickTarget = link;
                                    this.logger.debug(`通过用户名找到链接: ${link.href}`);
                                    break;
                                }
                            }
                            if (clickTarget) break;
                            parentElement = parentElement.parentElement;
                            maxLevels--;
                        }
                        
                        if (clickTarget) break;
                    }
                }
                
                if (clickTarget) {
                    await this.performClick(clickTarget, '用户名区域');
                    clickSuccess = true;
                }
            } catch (e) {
                this.logger.warn('策略1失败:', e.message);
            }

            // 🎯 策略2: 点击头像 (多种选择器)
            if (!clickSuccess) {
                this.logger.info('🎯 策略2: 多方式查找头像...');
                try {
                    const avatarSelectors = [
                        'img[alt*="avatar"]',
                        'img[src*="avatar"]', 
                        'img[class*="avatar"]',
                        'span img',
                        'div > img:first-child',
                        'img'
                    ];
                    
                    for (const selector of avatarSelectors) {
                        const avatar = notificationItem.querySelector(selector);
                        if (avatar && this.isElementVisible(avatar)) {
                            // 检查头像是否在链接内
                            const parentLink = avatar.closest('a');
                            clickTarget = parentLink || avatar;
                            
                            this.logger.debug(`找到头像元素 (${selector}):`, clickTarget.tagName);
                            await this.performClick(clickTarget, '头像');
                            clickSuccess = true;
                            break;
                        }
                    }
                } catch (e) {
                    this.logger.warn('策略2失败:', e.message);
                }
            }

            // 🎯 策略3: 通过用户链接模式
            if (!clickSuccess) {
                this.logger.info('🎯 策略3: 查找用户链接模式...');
                try {
                    for (const link of allLinks) {
                        const href = link.href || '';
                        const text = link.textContent?.trim() || '';
                        
                        // 检查多种用户链接模式
                        const isUserLink = 
                            href.includes(`@${userName}`) ||
                            href.includes(`/${userName}`) ||
                            href.includes(`user/${userName}`) ||
                            text === userName ||
                            text === `@${userName}`;
                            
                        if (isUserLink) {
                            clickTarget = link;
                            this.logger.debug(`找到用户链接: ${href} (文本: "${text}")`);
                            await this.performClick(clickTarget, '用户链接');
                            clickSuccess = true;
                            break;
                        }
                    }
                } catch (e) {
                    this.logger.warn('策略3失败:', e.message);
                }
            }

            // 🎯 策略4: 点击整个通知项（但避开回关按钮）
            if (!clickSuccess) {
                this.logger.info('🎯 策略4: 点击通知项的左侧区域...');
                try {
                    // 找到回关按钮的位置，避开它
                    const followButton = notificationItem.querySelector('button');
                    const notificationRect = notificationItem.getBoundingClientRect();
                    
                    let clickX, clickY;
                    
                    if (followButton) {
                        const buttonRect = followButton.getBoundingClientRect();
                        // 点击头像/用户名区域（通常在左侧）
                        clickX = notificationRect.left + 80; // 头像通常在前80px内
                        clickY = notificationRect.top + notificationRect.height / 2;
                    } else {
                        // 如果没找到按钮，点击左半部分
                        clickX = notificationRect.left + notificationRect.width * 0.3;
                        clickY = notificationRect.top + notificationRect.height / 2;
                    }
                    
                    // 使用坐标点击
                    this.logger.debug(`尝试坐标点击: (${clickX}, ${clickY})`);
                    await this.clickAtCoordinates(clickX, clickY);
                    clickSuccess = true;
                    this.logger.info('✅ 坐标点击完成');
                } catch (e) {
                    this.logger.warn('策略4失败:', e.message);
                }
            }

            // 🎯 策略5: 智能元素点击（排除按钮）
            if (!clickSuccess) {
                this.logger.info('🎯 策略5: 点击非按钮的可点击元素...');
                try {
                    const clickableElements = notificationItem.querySelectorAll('a, [role="button"]:not(button), [onclick], [tabindex]:not(button)');
                    for (const element of clickableElements) {
                        const text = element.textContent?.trim() || '';
                        const isFollowButton = text.includes('回关') || text.includes('Follow') || text.includes('好友');
                        
                        if (this.isElementVisible(element) && !isFollowButton && element.tagName !== 'BUTTON') {
                            clickTarget = element;
                            this.logger.debug(`使用元素: ${element.tagName} (文本: "${text.substring(0, 20)}")`);
                            await this.performClick(clickTarget, '智能元素');
                            clickSuccess = true;
                            break;
                        }
                    }
                } catch (e) {
                    this.logger.warn('策略5失败:', e.message);
                }
            }

            if (!clickSuccess) {
                this.logger.error('❌ 所有点击策略都失败了');
                this.logger.error('💡 建议检查通知项HTML结构是否发生变化');
                
                // 🔧 增强调试：显示通知项的HTML结构
                this.logger.debug('🔍 通知项HTML结构:');
                this.logger.debug(notificationItem.outerHTML.substring(0, 500) + '...');
                return false;
            }

            // 🔧 增强调试：增加等待时间并添加进度提示
            this.logger.info('⏳ 等待页面跳转...');
            await this.simulator.randomDelay(2000, 3000);
            
            // 检查是否有初步的URL变化
            let currentUrl = window.location.href;
            if (currentUrl !== beforeClickUrl) {
                this.logger.info(`🔄 检测到页面变化: ${currentUrl}`);
                // 如果有变化，再等待一些时间让页面完全加载
                await this.simulator.randomDelay(2000, 3000);
            } else {
                this.logger.warn('⚠️ 未检测到立即的页面变化，继续等待...');
                await this.simulator.randomDelay(3000, 4000);
            }

            // 验证是否成功进入个人主页
            const afterClickUrl = window.location.href;
            this.logger.debug(`操作后URL: ${afterClickUrl}`);

            // 🔧 增强调试：更宽松和更准确的个人主页检查
            const cleanUserName = userName.replace(/^@+/, '').replace(/\.$/, ''); // 清理用户名格式
            this.logger.debug(`🔍 清理后的用户名: "${cleanUserName}"`);
            
            const isProfilePage = 
                afterClickUrl.includes('tiktok.com/@') || 
                afterClickUrl.includes(`/@${cleanUserName}`) ||
                afterClickUrl.includes(`/${cleanUserName}`) ||
                afterClickUrl.includes('/user/') ||
                afterClickUrl.includes('/profile/') ||
                // 更宽松的检查：只要URL变化且不是特定的系统页面
                (afterClickUrl !== beforeClickUrl && 
                 !afterClickUrl.includes('/notifications') && 
                 !afterClickUrl.includes('/following') &&
                 !afterClickUrl.includes('/for-you') &&
                 !afterClickUrl.includes('/live') &&
                 !afterClickUrl.includes('/messages') &&
                 !afterClickUrl.includes('/404') &&
                 afterClickUrl.includes('tiktok.com'));
                 
            this.logger.debug(`🔍 URL检查结果:`, {
                'contains @': afterClickUrl.includes('tiktok.com/@'),
                'contains userName': afterClickUrl.includes(`/@${cleanUserName}`),
                'contains /user/': afterClickUrl.includes('/user/'),
                'URL changed': afterClickUrl !== beforeClickUrl,
                'not system page': !afterClickUrl.includes('/notifications'),
                'final result': isProfilePage
            });

            if (isProfilePage) {
                this.logger.info(`🎉 成功进入 ${userName} 的个人主页: ${afterClickUrl}`);
                return true;
            } else {
                this.logger.warn(`⚠️ 点击后未能进入个人主页`);
                this.logger.warn(`   当前URL: ${afterClickUrl}`);
                this.logger.warn(`   预期包含: @${userName} 或 /user/`);
                return false;
            }

        } catch (error) {
            this.logger.error('❌ 进入个人主页过程中出现错误:', error);
            return false;
        }
    }

    /**
     * 执行点击操作的通用方法 - 增强版真实点击模拟
     */
    async performClick(element, strategyName) {
        try {
            this.logger.debug(`执行${strategyName}点击...`);
            
            // 滚动到元素
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await this.simulator.randomDelay(1000, 1500);
            
            // 🔧 增强：对于用户链接，尝试多种真实点击方式
            if (element.tagName === 'A' && element.href) {
                const targetUrl = element.href;
                this.logger.debug(`点击链接: ${targetUrl}`);
                
                // 方法1: 超真实点击事件序列
                try {
                    await this.performSuperRealClick(element);
                    this.logger.info(`✅ ${strategyName}超真实点击完成`);
                    return;
                } catch (e) {
                    this.logger.warn('超真实点击失败，尝试其他方法:', e.message);
                }
                
                // 方法2: 直接导航（作为fallback）
                try {
                    this.logger.info(`🔄 fallback：直接导航到 ${targetUrl}`);
                    window.location.href = targetUrl;
                    this.logger.info(`✅ ${strategyName}直接导航完成`);
                    return;
                } catch (e) {
                    this.logger.warn('直接导航失败:', e.message);
                }
                
                // 方法3: 原有方法
                await this.simulator.simulateRealClick(element);
            } else {
                // 对于其他元素，使用智能点击
                await this.simulator.smartClick(element);
            }
            
            this.logger.info(`✅ ${strategyName}点击完成`);
        } catch (error) {
            this.logger.warn(`${strategyName}点击失败:`, error.message);
            throw error;
        }
    }
    
    /**
     * 超真实点击模拟 - 完整的鼠标事件序列
     */
    async performSuperRealClick(element) {
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // 添加一点随机偏移，模拟真实用户点击
        const offsetX = (Math.random() - 0.5) * Math.min(rect.width * 0.3, 10);
        const offsetY = (Math.random() - 0.5) * Math.min(rect.height * 0.3, 10);
        const clickX = centerX + offsetX;
        const clickY = centerY + offsetY;
        
        this.logger.debug(`超真实点击坐标: (${clickX.toFixed(1)}, ${clickY.toFixed(1)})`);
        
        // 完整的鼠标事件序列
        const events = [
            'mouseover',
            'mouseenter', 
            'mousemove',
            'mousedown',
            'focus',
            'mouseup',
            'click'
        ];
        
        for (const eventType of events) {
            const event = new MouseEvent(eventType, {
                view: window,
                bubbles: true,
                cancelable: true,
                clientX: clickX,
                clientY: clickY,
                button: 0,
                buttons: eventType === 'mousedown' ? 1 : 0,
                detail: eventType === 'click' ? 1 : 0
            });
            
            element.dispatchEvent(event);
            
            // 在事件之间添加微小延迟，模拟真实用户操作
            if (['mouseover', 'mousedown', 'mouseup'].includes(eventType)) {
                await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 50));
            }
        }
        
        // 如果是链接，确保触发导航
        if (element.tagName === 'A' && element.href) {
            // 模拟键盘事件（有些页面需要）
            const keydownEvent = new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                bubbles: true
            });
            element.dispatchEvent(keydownEvent);
            
            const keyupEvent = new KeyboardEvent('keyup', {
                key: 'Enter',
                code: 'Enter', 
                bubbles: true
            });
            element.dispatchEvent(keyupEvent);
        }
    }

    /**
     * 坐标点击方法
     */
    async clickAtCoordinates(x, y) {
        try {
            // 创建点击事件
            const clickEvent = new MouseEvent('click', {
                view: window,
                bubbles: true,
                cancelable: true,
                clientX: x,
                clientY: y
            });
            
            // 获取坐标位置的元素
            const targetElement = document.elementFromPoint(x, y);
            if (targetElement) {
                this.logger.debug(`坐标位置元素: ${targetElement.tagName}`);
                targetElement.dispatchEvent(clickEvent);
                
                // 如果是链接，也尝试触发导航
                if (targetElement.tagName === 'A' && targetElement.href) {
                    this.logger.debug(`触发链接导航: ${targetElement.href}`);
                    await this.simulator.randomDelay(500, 1000);
                    targetElement.click();
                }
            }
        } catch (error) {
            this.logger.warn('坐标点击失败:', error.message);
            throw error;
        }
    }

    /**
     * 🛠️ 调试功能：直接测试回关流程（跳过小红点检测）
     */
    async debugFollowBackFlow() {
        try {
            this.logger.info('🎉 调试回关流程已启动！');
            this.logger.info('📋 执行步骤：1.检查页面 → 2.找通知项 → 3.回关用户 → 4.进入主页 → 5.发送消息');
            
            // 步骤1: 检查是否在通知页面
            this.logger.info('📍 步骤1：检查页面环境...');
            if (!this.isOnNotificationPage()) {
                this.logger.error('❌ 请先进入TikTok通知页面: https://www.tiktok.com/notifications');
                return false;
            }
            this.logger.info('✅ 页面检查通过，当前在通知页面');

            // 步骤2: 分析通知项结构
            this.logger.info('📍 步骤2：分析通知项结构...');
            await this.analyzeNotificationStructure();

            // 步骤3: 查找并处理关注通知
            this.logger.info('📍 步骤3：查找关注通知并执行回关流程...');
            
            // 查找所有通知项
            const notificationItems = document.querySelectorAll('#header-inbox-list > ul:nth-child(2) > li');
            this.logger.info(`📊 发现 ${notificationItems.length} 个通知项`);

            if (notificationItems.length === 0) {
                this.logger.warn('⚠️ 未找到任何通知项，请确保有人关注了你');
                return false;
            }

            // 查找关注类型的通知
            let foundFollowNotification = false;
            let processedCount = 0;
            let alreadyFriendsCount = 0;
            let failedCount = 0;

            for (let i = 0; i < Math.min(notificationItems.length, 3); i++) { // 只处理前3个，避免过度操作
                const item = notificationItems[i];
                const itemText = item.textContent || '';
                
                this.logger.debug(`🔍 检查通知项 ${i + 1}: ${itemText.substring(0, 50)}...`);

                // 检查是否是关注类型的通知
                if (itemText.includes('关注了你') || itemText.includes('followed you')) {
                    foundFollowNotification = true;
                    this.logger.info(`💝 发现关注通知 ${i + 1}，开始处理...`);
                    
                    try {
                        // 检查是否已经处理过（避免与正常流程冲突）
                        if (this.processedElements.has(item)) {
                            this.logger.info(`⏭️ 通知项 ${i + 1} 已被处理过，跳过`);
                            alreadyFriendsCount++;
                            continue;
                        }

                        // 执行调试专用的简化回关流程（不重复回关）
                        const success = await this.processDebugFollowBackFlow(item, i + 1);
                        if (success === true) {
                            processedCount++;
                            this.logger.info(`✅ 通知项 ${i + 1} 处理成功`);
                        } else if (success === 'already_friends') {
                            alreadyFriendsCount++;
                            this.logger.info(`🎉 通知项 ${i + 1} 已经是好友`);
                        } else {
                            failedCount++;
                            this.logger.warn(`⚠️ 通知项 ${i + 1} 处理失败`);
                        }
                        
                        // 标记为已处理
                        this.processedElements.add(item);
                    } catch (error) {
                        failedCount++;
                        this.logger.error(`❌ 处理通知项 ${i + 1} 时出错:`, error.message);
                    }

                    // 处理间隔
                    if (i < notificationItems.length - 1) {
                        this.logger.debug('⏱️ 等待处理下一个通知项...');
                        await this.simulator.randomDelay(2000, 3000);
                    }
                }
            }

            // 总结结果
            if (!foundFollowNotification) {
                this.logger.warn('⚠️ 未找到关注类型的通知，请确保有新的关注者');
                return false;
            }

            const totalProcessed = processedCount + alreadyFriendsCount;
            
            this.logger.info('\n📊 === 调试结果统计 ===');
            this.logger.info(`🆕 新回关用户: ${processedCount} 个`);
            this.logger.info(`🎉 已是好友: ${alreadyFriendsCount} 个`);
            this.logger.info(`❌ 处理失败: ${failedCount} 个`);
            this.logger.info(`📈 总计处理: ${totalProcessed} 个`);

            if (totalProcessed > 0) {
                if (processedCount > 0) {
                    this.logger.info(`🎉 调试成功！新回关了 ${processedCount} 个用户，${alreadyFriendsCount} 个已经是好友`);
                    this.logger.info('📋 完整流程已执行：检查页面 ✅ → 找通知项 ✅ → 回关用户 ✅ → 进入主页 ✅ → 发送消息 ✅');
                } else {
                    this.logger.info(`🎉 调试完成！所有 ${alreadyFriendsCount} 个用户都已经是好友，无需回关`);
                }
                return true;
            } else {
                this.logger.warn('⚠️ 虽然找到了关注通知，但处理都失败了');
                this.logger.warn('💡 建议：检查按钮选择器是否正确，或尝试刷新页面后重试');
                return false;
            }

        } catch (error) {
            this.logger.error('❌ 调试回关流程执行失败:', error);
            this.logger.error('🔧 请检查控制台错误信息，或尝试刷新页面后重试');
            return false;
        }
    }

    /**
     * 🔄 调试专用的回关流程处理（避免重复回关）
     */
    async processDebugFollowBackFlow(notificationItem, itemIndex) {
        try {
            this.logger.info(`🔧 调试模式：处理通知项 ${itemIndex}...`);

            // 第1步：提取用户名
            const userName = this.extractUserNameFromNotification(notificationItem);
            if (!userName) {
                this.logger.warn('❌ 无法提取用户名');
                return false;
            }
            this.logger.info(`👤 目标用户: ${userName}`);

            // 第2步：检查是否已经是好友（避免重复回关）
            const followButton = notificationItem.querySelector('div > button');
            if (!followButton) {
                this.logger.warn('❌ 未找到回关按钮');
                return false;
            }

            const buttonText = followButton.textContent?.trim();
            this.logger.info(`🔍 按钮当前状态: "${buttonText}"`);

            const alreadyFriendsTexts = ['好友', 'Friends', 'Following', '已关注', 'Followed'];
            if (alreadyFriendsTexts.some(text => buttonText.includes(text))) {
                this.logger.info(`🎉 ${userName} 已经是好友，跳过回关`);
                return 'already_friends';
            }

            // 第3步：执行回关
            this.logger.info(`💝 步骤1：回关用户 ${userName}...`);
            const followSuccess = await this.clickFollowButtonInNotification(notificationItem, userName);
            if (followSuccess === 'already_friends') {
                this.logger.info(`🎉 ${userName} 已经是好友，跳过后续流程`);
                return 'already_friends';
            }
            if (!followSuccess) {
                this.logger.warn(`❌ 回关 ${userName} 失败`);
                return false;
            }
            this.logger.info(`✅ 步骤1完成：成功回关 ${userName}`);

            // 第4步：进入用户主页 - 增强调试版本
            this.logger.info(`🏠 步骤2：进入 ${userName} 的个人主页...`);
            
            // 🔧 增强调试：在点击前分析通知项结构
            this.logger.info('🔍 分析通知项结构以辅助调试...');
            try {
                const allImages = notificationItem.querySelectorAll('img');
                const allLinks = notificationItem.querySelectorAll('a');
                const allButtons = notificationItem.querySelectorAll('button');
                
                this.logger.debug(`📊 元素统计: ${allImages.length}个图片, ${allLinks.length}个链接, ${allButtons.length}个按钮`);
                
                // 详细分析链接
                allLinks.forEach((link, index) => {
                    this.logger.debug(`🔗 链接${index}: href="${link.href || 'none'}", text="${(link.textContent || '').slice(0, 30)}"`);
                });
                
                // 查找用户名相关元素
                const textElements = notificationItem.querySelectorAll('*');
                let foundUserName = false;
                for (const el of textElements) {
                    const text = el.textContent?.trim();
                    if (text === userName) {
                        this.logger.debug(`👤 找到用户名元素: ${el.tagName}, text="${text}"`);
                        foundUserName = true;
                        break;
                    }
                }
                if (!foundUserName) {
                    this.logger.warn(`⚠️ 在通知项中未找到用户名"${userName}"`);
                }
                
            } catch (analysisError) {
                this.logger.warn('结构分析失败:', analysisError.message);
            }
            
            const navigationSuccess = await this.clickAvatarToProfile(notificationItem, userName);
            if (!navigationSuccess) {
                this.logger.warn(`❌ 无法进入 ${userName} 的个人主页`);
                this.logger.info('💡 可能的原因:');
                this.logger.info('   1. 用户名提取错误');
                this.logger.info('   2. 通知项结构发生变化');
                this.logger.info('   3. 网络延迟或页面加载缓慢');
                this.logger.info('   4. TikTok防机器人措施');
                this.logger.info(`✅ 但回关已成功，任务部分完成`);
                return true; // 回关成功就算部分成功
            }
            this.logger.info(`✅ 步骤2完成：成功进入 ${userName} 的个人主页`);

            // 第5步：发送问候消息
            this.logger.info(`💬 步骤3：向 ${userName} 发送问候消息...`);
            const messageSuccess = await this.sendGreetingOnProfile(userName);
            if (messageSuccess) {
                this.logger.info(`✅ 步骤3完成：成功发送问候消息给 ${userName}`);
                this.logger.info(`🎉 完整流程成功：${userName} - 回关 ✅ + 进入主页 ✅ + 发送消息 ✅`);
                return true;
            } else {
                this.logger.warn(`⚠️ 发送消息失败，但前面步骤都成功了`);
                this.logger.info(`✅ 部分流程成功：${userName} - 回关 ✅ + 进入主页 ✅`);
                return true; // 前面步骤成功了也算成功
            }

        } catch (error) {
            this.logger.error(`❌ 调试回关流程失败:`, error);
            return false;
        }
    }

    /**
     * 🔄 完整的回关流程处理（已弃用 - 避免重复使用）
     */
    async processCompleteFollowBackFlow(notificationItem, itemIndex) {
        try {
            this.logger.info(`🎯 开始处理通知项 ${itemIndex} 的完整回关流程...`);

            // 第1步：提取用户名
            const userName = this.extractUserNameFromNotification(notificationItem);
            if (!userName) {
                this.logger.warn('❌ 无法提取用户名');
                return false;
            }
            this.logger.info(`👤 目标用户: ${userName}`);

            // 第2步：执行回关
            this.logger.info(`💝 步骤1：回关用户 ${userName}...`);
            const followSuccess = await this.clickFollowButtonInNotification(notificationItem, userName);
            if (followSuccess === 'already_friends') {
                this.logger.info(`🎉 ${userName} 已经是好友，跳过回关和发送消息流程`);
                return 'already_friends'; // 传递已经是好友的状态
            }
            if (!followSuccess) {
                this.logger.warn(`❌ 回关 ${userName} 失败`);
                return false;
            }
            this.logger.info(`✅ 步骤1完成：成功回关 ${userName}`);

            // 第3步：进入用户主页
            this.logger.info(`🏠 步骤2：进入 ${userName} 的个人主页...`);
            const navigationSuccess = await this.clickAvatarToProfile(notificationItem, userName);
            if (!navigationSuccess) {
                this.logger.warn(`❌ 无法进入 ${userName} 的个人主页`);
                this.logger.info(`✅ 但回关已成功，任务部分完成`);
                return true; // 回关成功就算部分成功
            }
            this.logger.info(`✅ 步骤2完成：成功进入 ${userName} 的个人主页`);

            // 第4步：发送问候消息
            this.logger.info(`💬 步骤3：向 ${userName} 发送问候消息...`);
            const messageSuccess = await this.sendGreetingOnProfile(userName);
            if (messageSuccess) {
                this.logger.info(`✅ 步骤3完成：成功发送问候消息给 ${userName}`);
                this.logger.info(`🎉 完整流程成功：${userName} - 回关 ✅ + 进入主页 ✅ + 发送消息 ✅`);
                return true;
            } else {
                this.logger.warn(`⚠️ 发送消息失败，但前面步骤都成功了`);
                this.logger.info(`✅ 部分流程成功：${userName} - 回关 ✅ + 进入主页 ✅`);
                return true; // 前面步骤成功就算成功
            }

        } catch (error) {
            this.logger.error(`❌ 处理完整回关流程时出错:`, error);
            return false;
        }
    }

    /**
     * 🔍 分析通知项结构 - 帮助找到正确的头像选择器
     */
    async analyzeNotificationStructure() {
        try {
            this.logger.info('🔍 开始分析通知项结构...');
            
            // 查找所有通知项
            const notificationItems = document.querySelectorAll('#header-inbox-list > ul:nth-child(2) > li');
            
            if (notificationItems.length === 0) {
                this.logger.warn('未找到通知项，可能选择器需要更新');
                return;
            }

            this.logger.info(`📋 找到 ${notificationItems.length} 个通知项`);

            // 分析前3个通知项的结构
            for (let i = 0; i < Math.min(3, notificationItems.length); i++) {
                const item = notificationItems[i];
                this.logger.info(`\n📦 === 通知项 ${i + 1} 结构分析 ===`);
                
                // 获取通知项的HTML结构
                console.log(`通知项 ${i + 1} HTML:`, item.outerHTML);
                
                // 查找所有图片元素
                const images = item.querySelectorAll('img');
                this.logger.info(`🖼️ 找到 ${images.length} 个图片元素:`);
                
                images.forEach((img, imgIndex) => {
                    const imgInfo = {
                        index: imgIndex,
                        src: img.src?.substring(0, 100) + '...',
                        alt: img.alt,
                        className: img.className,
                        width: img.width || img.style.width,
                        height: img.height || img.style.height,
                        visible: this.isElementVisible(img),
                        clickable: !img.style.pointerEvents || img.style.pointerEvents !== 'none'
                    };
                    console.log(`  图片 ${imgIndex}:`, imgInfo);
                });

                // 查找所有链接元素
                const links = item.querySelectorAll('a');
                this.logger.info(`🔗 找到 ${links.length} 个链接元素:`);
                
                links.forEach((link, linkIndex) => {
                    const linkInfo = {
                        index: linkIndex,
                        href: link.href,
                        textContent: link.textContent?.trim().substring(0, 50),
                        className: link.className,
                        visible: this.isElementVisible(link)
                    };
                    console.log(`  链接 ${linkIndex}:`, linkInfo);
                });

                // 查找所有按钮
                const buttons = item.querySelectorAll('button');
                this.logger.info(`🔘 找到 ${buttons.length} 个按钮元素:`);
                
                buttons.forEach((button, btnIndex) => {
                    const btnInfo = {
                        index: btnIndex,
                        textContent: button.textContent?.trim(),
                        className: button.className,
                        visible: this.isElementVisible(button),
                        disabled: button.disabled
                    };
                    console.log(`  按钮 ${btnIndex}:`, btnInfo);
                });

                this.logger.info(`📦 === 通知项 ${i + 1} 分析完成 ===\n`);
            }

        } catch (error) {
            this.logger.error('分析通知项结构失败:', error);
        }
    }

    /**
     * 策略2：通过页面结构分析查找回关按钮
     */
    async findAndClickFollowButtonsByStructure() {
        try {
            this.logger.debug('🎯 策略2：通过页面结构查找回关按钮...');

            // 查找通知列表容器
            const notificationSelectors = [
                '#header-inbox-list',
                '[data-e2e="notification-list"]',
                '.notification-list',
                'div[role="list"]',
                'ul[role="list"]'
            ];

            let notificationContainer = null;
            for (const selector of notificationSelectors) {
                notificationContainer = document.querySelector(selector);
                if (notificationContainer) {
                    this.logger.debug(`找到通知容器: ${selector}`);
                    break;
                }
            }

            if (!notificationContainer) {
                this.logger.debug('未找到通知容器');
                return false;
            }

            // 查找通知项
            const notificationItems = notificationContainer.querySelectorAll('li, div[role="listitem"], .notification-item');
            this.logger.info(`📊 找到 ${notificationItems.length} 个通知项`);

            let processedCount = 0;

            for (const item of notificationItems) {
                if (this.processedElements.has(item)) continue;

                // 在每个通知项中查找按钮
                const buttons = item.querySelectorAll('button');
                for (const button of buttons) {
                    const text = button.textContent?.trim();
                    if (text && (text.includes('回关') || text.includes('Follow') || text.includes('关注'))) {
                        if (this.isElementVisible(button) && !button.disabled) {
                            this.logger.info('🎯 点击回关按钮（结构分析）...');
                            await this.simulator.simulateRealClick(button);
                            await this.simulator.randomDelay(2000, 3000);

                            this.processedElements.add(item);
                            this.updateStats('follow');
                            processedCount++;

                            this.logger.info('✅ 回关成功（结构分析方式）');
                            await this.simulator.humanDelay();
                            break;
                        }
                    }
                }
            }

            return processedCount > 0;

        } catch (error) {
            this.logger.error('策略2失败:', error);
            return false;
        }
    }

    /**
     * 策略3：使用CSS选择器组合
     */
    async findAndClickFollowButtonsByCssSelectors() {
        try {
            this.logger.debug('🎯 策略3：使用CSS选择器查找回关按钮...');

            // 多个可能的回关按钮选择器
            const followButtonSelectors = [
                // 原有的用户提供的选择器
                '#header-inbox-list > ul:nth-child(2) > li > div > button',
                
                // 通用的回关按钮选择器
                'button[aria-label*="关注"]',
                'button[aria-label*="Follow"]',
                'button[data-e2e*="follow"]',
                'button[data-testid*="follow"]',
                
                // 通过颜色和样式特征
                'button[style*="rgb(254, 44, 85)"]', // TikTok红色
                'button[style*="#fe2c55"]',
                
                // 通过类名模式
                'button[class*="follow"]',
                'button[class*="Follow"]',
                'button[class*="关注"]',
                
                // 在通知区域的按钮
                '#header-inbox-list button',
                '.notification-list button',
                '[data-e2e="notification"] button',
                
                // 红色背景的按钮（通常是关注按钮）
                'button[class*="red"]',
                'button[class*="primary"]'
            ];

            let processedCount = 0;

            for (const selector of followButtonSelectors) {
                try {
                    const buttons = document.querySelectorAll(selector);
                    
                    for (const button of buttons) {
                        if (this.processedElements.has(button)) continue;
                        
                        const text = button.textContent?.trim();
                        const ariaLabel = button.getAttribute('aria-label');
                        
                        // 检查是否是回关按钮
                        const isFollowButton = (
                            (text && (text.includes('回关') || text.includes('Follow') || text.includes('关注'))) ||
                            (ariaLabel && (ariaLabel.includes('关注') || ariaLabel.includes('Follow')))
                        );

                        if (isFollowButton && this.isElementVisible(button) && !button.disabled) {
                            this.logger.info(`🎯 点击回关按钮（选择器: ${selector}）...`);
                            this.logger.debug(`按钮文本: "${text}", aria-label: "${ariaLabel}"`);
                            
                            await this.simulator.simulateRealClick(button);
                            await this.simulator.randomDelay(2000, 3000);

                            this.processedElements.add(button);
                            this.updateStats('follow');
                            processedCount++;

                            this.logger.info('✅ 回关成功（CSS选择器方式）');
                            await this.simulator.humanDelay();
                        }
                    }
                } catch (selectorError) {
                    this.logger.debug(`选择器 ${selector} 执行失败:`, selectorError);
                    continue;
                }
            }

            return processedCount > 0;

        } catch (error) {
            this.logger.error('策略3失败:', error);
            return false;
        }
    }

    /**
     * 从回关按钮查找用户容器（使用准确选择器）
     */
    findUserContainerFromButton(button) {
        try {
            // 从回关按钮向上查找到通知项容器
            let current = button;
            let level = 0;
            const maxLevel = 10;

            while (current && level < maxLevel) {
                // 检查是否是li元素（通知项）
                if (current.tagName === 'LI') {
                    // 在这个li中查找用户名链接
                    const userLink = current.querySelector('div > div > a');
                    if (userLink) {
                        this.logger.debug('找到用户链接:', userLink.href);
                        return current;
                    }
                }
                current = current.parentElement;
                level++;
            }

            this.logger.debug('未找到用户容器');
            return null;
        } catch (error) {
            this.logger.error('查找用户容器失败:', error);
            return null;
        }
    }

    /**
     * 回关并发送问候消息（使用用户选择器版本）
     */
    async handleFollowBackWithGreeting(userContainer, followButton) {
        try {
            this.logger.info('🎯 开始完整回关+问候消息流程...');

            // 第一步：在用户容器中查找用户名链接
            const userNameLink = userContainer.querySelector('div > div > a');
            if (!userNameLink) {
                this.logger.warn('未在容器中找到用户名链接');
                return false;
            }

            const userName = userNameLink.textContent?.trim();
            this.logger.info(`🔗 找到用户链接: ${userName}`);
            
            // 滚动到用户链接位置
            userNameLink.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await this.simulator.randomDelay(1000, 1500);
            
            // 第二步：点击用户名进入个人主页
            this.logger.info('👤 点击用户名进入个人主页...');
            await this.simulator.simulateRealClick(userNameLink);
            await this.simulator.randomDelay(4000, 6000); // 等待个人主页加载

            // 第三步：在个人主页找到消息按钮
            this.logger.info('📨 寻找个人主页消息按钮...');
            
            // 等待页面完全加载
            let attempts = 0;
            let messageButton = null;
            
            while (attempts < 5) {
                messageButton = document.querySelector(this.selectors.sendMessageFromProfile);
                if (messageButton && this.isElementVisible(messageButton)) {
                    break;
                }
                
                this.logger.debug(`第 ${attempts + 1} 次尝试查找消息按钮...`);
                await this.simulator.randomDelay(1000, 2000);
                attempts++;
            }

            if (!messageButton) {
                this.logger.warn('未找到个人主页消息按钮');
                return false;
            }

            // 第四步：点击消息按钮
            this.logger.info('💬 点击消息按钮进入对话...');
            await this.simulator.simulateRealClick(messageButton);
            await this.simulator.randomDelay(3000, 5000); // 等待对话界面加载

            // 第五步：发送问候消息
            const messageSent = await this.sendGreetingMessageWithUserSelector();
            
            if (messageSent) {
                this.logger.info(`✅ 成功向 ${userName} 发送问候消息`);
                
                // 可选：返回通知页面
                if (this.originalNotificationUrl) {
                    await this.simulator.randomDelay(2000, 3000);
                    this.logger.info('🔄 返回通知页面...');
                    // window.location.href = this.originalNotificationUrl;
                }
                
                return true;
            } else {
                this.logger.warn(`⚠️ 向 ${userName} 发送问候消息失败`);
                return false;
            }

        } catch (error) {
            this.logger.error('回关+发送消息流程失败:', error);
            return false;
        }
    }

    /**
     * 使用用户选择器发送问候消息
     */
    async sendGreetingMessageWithUserSelector() {
        try {
            this.logger.info('⌨️ 开始输入问候消息...');

            // 使用用户提供的精确输入框选择器
            let chatInput = null;
            let attempts = 0;
            
            while (attempts < 5) {
                chatInput = document.querySelector(this.selectors.chatInputBox);
                if (chatInput && this.isElementVisible(chatInput)) {
                    this.logger.debug('找到对话输入框');
                    break;
                }
                
                this.logger.debug(`第 ${attempts + 1} 次尝试查找输入框...`);
                await this.simulator.randomDelay(1000, 2000);
                attempts++;
            }

            if (!chatInput) {
                this.logger.error('未找到对话输入框');
                return false;
            }

            // 获取问候消息
            const greetingMessage = this.config.autoFollow.welcomeMessage || '你好！感谢关注，很高兴认识你！😊';
            this.logger.info(`准备发送消息: ${greetingMessage}`);
            
            // 聚焦输入框
            await this.simulator.simulateRealClick(chatInput);
            await this.simulator.randomDelay(500, 1000);

            // 使用contenteditable输入方式
            const inputSuccess = await this.simulateTypingInContentEditable(chatInput, greetingMessage);
            
            if (!inputSuccess) {
                this.logger.error('输入问候消息失败');
                return false;
            }

            // 发送消息
            await this.simulator.randomDelay(1000, 2000);
            
            // 尝试按Enter发送
            await this.simulator.simulateEnterKey(chatInput);
            
            // 也尝试寻找发送按钮作为备选
            const sendButton = document.querySelector('button[data-e2e="send-button"], button[aria-label*="发送"], button[aria-label*="Send"]');
            if (sendButton && this.isElementVisible(sendButton)) {
                await this.simulator.randomDelay(500, 1000);
                await this.simulator.simulateRealClick(sendButton);
                this.logger.debug('点击发送按钮');
            }

            this.logger.info('✅ 问候消息发送完成');
            return true;

        } catch (error) {
            this.logger.error('发送问候消息失败:', error);
            return false;
        }
    }

    /**
     * 在个人主页发送问候消息 - 基于Chrome MCP调试结果
     */
    async sendGreetingOnProfile(userName) {
        try {
            this.logger.info(`💬 在 ${userName} 的个人主页发送问候消息...`);
            
            // 记录当前URL，确保在个人主页
            const currentUrl = window.location.href;
            this.logger.debug(`当前URL: ${currentUrl}`);
            
            if (!currentUrl.includes('tiktok.com/@') && !currentUrl.includes('/user/')) {
                this.logger.warn('⚠️ 当前不在个人主页，无法发送消息');
                return false;
            }

            // 第一步：精确排除左侧导航栏，定位个人主页右上角的消息按钮
            this.logger.info('🔍 通过坐标精确定位个人主页右上角的消息按钮...');
            
            // 获取页面尺寸信息
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            const rightAreaMinX = windowWidth * 0.4; // 只在屏幕右侧60%区域查找
            const topAreaMaxY = windowHeight * 0.6; // 扩大到上60%区域
            
            this.logger.debug(`屏幕尺寸: ${windowWidth}x${windowHeight}, 搜索区域: X>${rightAreaMinX}, Y<${topAreaMaxY}`);
            
            // 查找所有可能的消息按钮
            const allButtons = document.querySelectorAll('button, a[role="button"], div[role="button"], a');
            const candidateButtons = [];
            
            for (const btn of allButtons) {
                // 检查是否包含消息相关文本
                const text = btn.textContent?.trim() || '';
                const ariaLabel = btn.getAttribute('aria-label') || '';
                const className = btn.className || '';
                const href = btn.getAttribute('href') || '';
                
                const isMessageButton = 
                    text.includes('消息') || text.includes('Message') ||
                    ariaLabel.includes('消息') || ariaLabel.includes('Message') ||
                    className.includes('message');
                
                if (isMessageButton && btn.offsetHeight > 0 && btn.offsetWidth > 0) {
                    const rect = btn.getBoundingClientRect();
                    
                    // 🚨 严格排除左侧导航栏（Chrome MCP发现的结构）
                    const isLeftNavbar = 
                        rect.x < 400 || // 左侧400px内的按钮
                        href.includes('/messages') || // 导航栏消息链接
                        btn.closest('[data-e2e="nav-messages"]') || // 导航消息按钮
                        btn.closest('.TUXButton--secondary') || // 次级按钮样式（导航栏特有）
                        text === '消息' && rect.x < windowWidth * 0.3; // 纯"消息"文本且在左侧30%
                    
                    // 确保在目标区域且不是左侧导航栏
                    const isInTargetArea = rect.x > rightAreaMinX && rect.y < topAreaMaxY && !isLeftNavbar;
                    const isNotSidebar = rect.x > 400 && !isLeftNavbar; // 提高到400px
                    
                    candidateButtons.push({
                        element: btn,
                        text: text.slice(0, 20),
                        ariaLabel: ariaLabel.slice(0, 30),
                        href: href.slice(0, 30),
                        x: Math.round(rect.x),
                        y: Math.round(rect.y),
                        width: Math.round(rect.width),
                        height: Math.round(rect.height),
                        isInTargetArea: isInTargetArea,
                        isNotSidebar: isNotSidebar,
                        isLeftNavbar: isLeftNavbar,
                        priority: isInTargetArea && isNotSidebar && !isLeftNavbar ? 2 : 0
                    });
                }
            }
            
            this.logger.debug(`找到 ${candidateButtons.length} 个候选消息按钮:`);
            candidateButtons.forEach((btn, index) => {
                this.logger.debug(`  ${index+1}: "${btn.text}" href:"${btn.href}" 位置:(${btn.x}, ${btn.y}) 左侧导航栏:${btn.isLeftNavbar} 目标区域:${btn.isInTargetArea} 优先级:${btn.priority}`);
            });
            
            // 按优先级排序，选择最佳按钮
            candidateButtons.sort((a, b) => {
                if (a.priority !== b.priority) return b.priority - a.priority; // 优先级高的在前
                if (a.x !== b.x) return b.x - a.x; // X坐标大的在前（更靠右）
                return a.y - b.y; // Y坐标小的在前（更靠上）
            });
            
            let messageButton = null;
            if (candidateButtons.length > 0) {
                messageButton = candidateButtons[0].element;
                const bestBtn = candidateButtons[0];
                this.logger.info(`✅ 选择最佳消息按钮: "${bestBtn.text}" href:"${bestBtn.href}" 位置:(${bestBtn.x}, ${bestBtn.y}) 左侧导航栏:${bestBtn.isLeftNavbar} 优先级:${bestBtn.priority}`);
            }

            if (!messageButton) {
                this.logger.error('❌ 未找到个人主页的消息按钮');
                return false;
            }

            // 第二步：点击消息按钮
            this.logger.info('👆 点击消息按钮进入对话...');
            try {
                // 滚动到按钮位置
                messageButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
                await this.simulator.randomDelay(1000, 1500);
                
                // 点击消息按钮
                await this.simulator.smartClick(messageButton);
                this.logger.info('✅ 消息按钮点击完成');
                
                // 等待页面跳转到消息界面
                await this.simulator.randomDelay(3000, 4000);
                
            } catch (error) {
                this.logger.error('❌ 点击消息按钮失败:', error);
                return false;
            }

            // 第三步：验证是否进入消息界面
            const afterClickUrl = window.location.href;
            this.logger.debug(`点击后URL: ${afterClickUrl}`);
            
            const isMessagePage = 
                afterClickUrl.includes('/messages') ||
                afterClickUrl.includes('/chat') ||
                afterClickUrl.includes('/conversation');
                
            if (!isMessagePage) {
                this.logger.warn(`⚠️ 点击后未进入消息界面: ${afterClickUrl}`);
                return false;
            }

            this.logger.info('✅ 成功进入消息界面');

            // 第四步：发送问候消息
            return await this.sendGreetingInMessagePage(userName);

        } catch (error) {
            this.logger.error('❌ 在个人主页发送消息过程中出现错误:', error);
            return false;
        }
    }

    /**
     * 在消息页面发送问候消息
     */
    async sendGreetingInMessagePage(userName) {
        try {
            this.logger.info(`⌨️ 在消息页面向 ${userName} 发送问候消息...`);
            
            // 等待消息页面完全加载
            await this.simulator.randomDelay(2000, 3000);

            // 查找消息输入框 - 基于Chrome MCP验证的选择器（优先级排序）
            const inputSelectors = [
                // Chrome MCP验证有效的选择器 - 最高优先级
                '.notranslate.public-DraftEditor-content[contenteditable="true"]',
                'div[contenteditable="true"][role="textbox"]',
                'div[aria-label*="发送消息"]',
                // 其他备选选择器
                '[data-e2e="message-input"]',
                'div[contenteditable="true"]',
                '[role="textbox"]',
                '#placeholder-a99f2',  // 用户之前提供的选择器
                '[placeholder*="消息"]',
                '[placeholder*="Message"]',
                'textarea[placeholder]',
                'input[type="text"]'
            ];

            let messageInput = null;
            for (const selector of inputSelectors) {
                try {
                    const input = document.querySelector(selector);
                    if (input && this.isElementVisible(input)) {
                        messageInput = input;
                        this.logger.debug(`找到消息输入框: ${selector}`);
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }

            if (!messageInput) {
                this.logger.error('❌ 未找到消息输入框');
                return false;
            }

            // 输入问候消息
            const greetingMessage = this.config.autoFollow.welcomeMessage || 
                                  '感谢关注！✨ 欢迎来到我的TikTok，希望我的内容能带给你快乐~';
            
            this.logger.info(`📝 输入问候消息: "${greetingMessage}"`);

            // 基于Chrome MCP验证的输入方法
            messageInput.focus();
            messageInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await this.simulator.randomDelay(800, 1200);
            
            // 清空并输入消息 - Chrome MCP验证有效的方法
            messageInput.textContent = '';
            await this.simulator.randomDelay(200, 400);
            messageInput.textContent = greetingMessage;
            
            // 触发必要的事件 - 基于Chrome MCP测试
            ['input', 'change', 'keyup'].forEach(eventType => {
                try {
                    const event = new Event(eventType, { bubbles: true });
                    messageInput.dispatchEvent(event);
                } catch (e) {
                    this.logger.debug(`触发事件 ${eventType} 失败:`, e.message);
                }
            });

            // 查找并点击发送按钮
            await this.simulator.randomDelay(1000, 1500);
            
            // 智能发送按钮查找 - 基于位置和特征的综合判断
            this.logger.debug('🔍 智能查找发送按钮...');
            
            // 查找所有可能的发送按钮
            const allButtons = document.querySelectorAll('button, div[role="button"], a[role="button"]');
            const sendButtonCandidates = [];
            
            for (const btn of allButtons) {
                if (!btn.offsetHeight || !btn.offsetWidth) continue; // 跳过不可见元素
                
                const text = btn.textContent?.trim() || '';
                const ariaLabel = btn.getAttribute('aria-label') || '';
                const className = btn.className || '';
                const hasIcon = !!btn.querySelector('svg, i');
                
                // 检查是否为发送按钮
                const isSendButton = 
                    text.includes('发送') || text.includes('Send') ||
                    ariaLabel.includes('发送') || ariaLabel.includes('Send') ||
                    className.toLowerCase().includes('send') ||
                    (hasIcon && text === '' && ariaLabel.includes('Send'));
                
                if (isSendButton) {
                    const rect = btn.getBoundingClientRect();
                    
                    sendButtonCandidates.push({
                        element: btn,
                        text: text,
                        ariaLabel: ariaLabel,
                        x: Math.round(rect.x),
                        y: Math.round(rect.y),
                        hasIcon: hasIcon,
                        disabled: btn.disabled,
                        // 计算优先级：右侧 + 底部 + 有图标的按钮优先
                        priority: (rect.x > window.innerWidth * 0.5 ? 2 : 0) + 
                                 (rect.y > window.innerHeight * 0.7 ? 2 : 0) + 
                                 (hasIcon ? 1 : 0) +
                                 (btn.disabled ? -10 : 0)
                    });
                }
            }
            
            this.logger.debug(`找到 ${sendButtonCandidates.length} 个发送按钮候选:`);
            sendButtonCandidates.forEach((btn, index) => {
                this.logger.debug(`  ${index+1}: "${btn.text || btn.ariaLabel}" 位置:(${btn.x}, ${btn.y}) 图标:${btn.hasIcon} 优先级:${btn.priority}`);
            });
            
            // 按优先级排序，选择最佳按钮
            sendButtonCandidates.sort((a, b) => b.priority - a.priority);
            
            let sendButton = null;
            if (sendButtonCandidates.length > 0) {
                sendButton = sendButtonCandidates[0].element;
                const bestBtn = sendButtonCandidates[0];
                this.logger.info(`✅ 选择最佳发送按钮: "${bestBtn.text || bestBtn.ariaLabel}" 位置:(${bestBtn.x}, ${bestBtn.y}) 优先级:${bestBtn.priority}`);
            }

            // 🎯 终极发送方案：多重发送策略
            const sendSuccess = await this.performUltimateSend(messageInput, sendButton, greetingMessage);
            
            if (sendSuccess) {
                this.logger.info(`✅ 成功向 ${userName} 发送问候消息`);
                return true;
            } else {
                this.logger.warn('⚠️ 所有发送方式都失败了');
                return false;
            }

        } catch (error) {
            this.logger.error('❌ 在消息页面发送消息失败:', error);
            return false;
        }
    }

    /**
     * 从当前页面抓取可见的TikTok用户主页链接
     */
    collectVisibleUsersFromPage() {
        const links = Array.from(document.querySelectorAll('a[href*="/@"]'));
        const usersByUrl = new Map();

        for (const link of links) {
            if (!this.isElementVisible(link)) continue;

            const url = this.normalizeProfileUrl(link.href);
            if (!url) continue;

            const username = this.extractUsernameFromProfileUrl(url);
            if (!username) continue;

            const displayName = this.extractDisplayNameFromUserLink(link, username);
            usersByUrl.set(url, { username, displayName, url });
        }

        const users = Array.from(usersByUrl.values()).slice(0, 50);
        this.logger.info(`🔎 当前页面抓取到 ${users.length} 个可见用户`);
        return users;
    }

    normalizeProfileUrl(rawUrl) {
        try {
            const url = new URL(rawUrl, window.location.origin);
            const match = url.pathname.match(/^\/@([^/]+)/);
            if (!match) return null;

            return `${url.origin}/@${match[1]}`;
        } catch (error) {
            return null;
        }
    }

    extractUsernameFromProfileUrl(url) {
        const match = url.match(/\/@([^/?#]+)/);
        return match ? `@${decodeURIComponent(match[1])}` : '';
    }

    extractDisplayNameFromUserLink(link, username) {
        const container = link.closest('div, li, article') || link;
        const text = (container.textContent || link.textContent || '')
            .split('\n')
            .map(item => item.trim())
            .filter(Boolean)
            .find(item => item !== username && !item.includes('关注') && !item.includes('Follow'));

        return text || '';
    }

    /**
     * 当前用户主页：可选关注，然后打开私信并填入草稿，不自动发送
     */
    async prepareProfileMessageDraft(request) {
        const message = request.message || this.config.profileAssistant?.message || '你好！很高兴认识你 😊';
        const shouldFollow = !!request.shouldFollow;

        if (!window.location.href.includes('tiktok.com/@') && !window.location.href.includes('/user/')) {
            return { success: false, error: '请先打开一个TikTok用户主页再使用这个功能' };
        }

        if (shouldFollow) {
            const followResult = await this.followCurrentProfileIfNeeded();
            if (!followResult.success) {
                return followResult;
            }
        }

        const openedMessage = await this.openProfileMessagePage();
        if (!openedMessage.success) {
            return openedMessage;
        }

        const draftResult = await this.fillMessageDraft(message);
        if (!draftResult.success) {
            return draftResult;
        }

        this.showPageNotification('✅ 私信草稿已填好，请手动点击发送', 'success');
        return { success: true, message: '私信草稿已填好，请手动点击发送' };
    }

    /**
     * 如果当前主页还未关注，点击关注按钮
     */
    async followCurrentProfileIfNeeded() {
        const button = this.findProfileFollowButton();

        // DOM方式: 找到按钮直接点击
        if (button) {
            const text = button.textContent?.trim() || '';
            const ariaLabel = button.getAttribute('aria-label') || '';
            const label = `${text} ${ariaLabel}`;

            if (this.isFollowingLabel(label)) {
                this.logger.info('当前用户已关注，跳过关注步骤');
                return { success: true };
            }

            if (!this.isFollowLabel(label)) {
                return { success: false, error: `当前按钮不像关注按钮: ${text || ariaLabel || '无文本'}` };
            }

            await this.simulator.smartClick(button);
            await this.simulator.randomDelay(1500, 2500);
            this.logger.info('✅ 当前主页关注动作完成 (DOM点击)');
            return { success: true };
        }

        // API兜底: 从SSR数据中提取当前主页用户信息, 调用关注API
        const ssrData = this.readSSRData();
        const profileUser = ssrData?.userData?.userInfo?.user;
        if (profileUser?.id) {
            this.logger.info('DOM未找到关注按钮, 尝试API方式关注:', profileUser.uniqueId);
            const result = await this.callTikTokAPI(this.apiEndpoints.followUser, {
                sec_user_id: profileUser.secUid || profileUser.uid,
                user_id: profileUser.id,
                type: 1
            });
            if (result.success) {
                this.logger.info('✅ 当前主页关注动作完成 (API)');
                return { success: true };
            }
            this.logger.warn('API关注失败:', result.data || result.error);
        }

        return { success: false, error: '未找到当前主页的关注按钮且API关注也失败' };
    }

    /**
     * 查找个人主页顶部的关注按钮 (多策略)
     */
    findProfileFollowButton() {
        // 策略1: 用通用策略查找器 (data-e2e / aria-label 较稳定)
        const found = this.findElementByStrategies([
            { strategy: 'data-e2e', value: 'follow-button' },
            { strategy: 'aria-label', value: 'Follow' },
            { strategy: 'aria-label', value: '关注' },
            { strategy: 'css', value: this.selectors.followButtonOnProfile }
        ]);
        if (found) return found;

        // 策略2: 遍历所有button, 按位置+文本筛选 (兜底)
        const buttons = Array.from(document.querySelectorAll('button'));
        const candidates = [];

        for (const button of buttons) {
            if (!this.isElementVisible(button) || button.disabled) continue;

            const text = button.textContent?.trim() || '';
            const ariaLabel = button.getAttribute('aria-label') || '';
            const label = `${text} ${ariaLabel}`;
            const rect = button.getBoundingClientRect();
            const isTopProfileArea = rect.x > window.innerWidth * 0.25 && rect.y < window.innerHeight * 0.55;

            if (isTopProfileArea && (this.isFollowLabel(label) || this.isFollowingLabel(label))) {
                candidates.push({ button, x: rect.x, y: rect.y });
            }
        }

        candidates.sort((a, b) => a.y - b.y || b.x - a.x);
        return candidates[0]?.button || null;
    }

    isFollowLabel(label) {
        return /(^|\s)(关注|Follow|Follow Back|回关)(\s|$)/i.test(label);
    }

    isFollowingLabel(label) {
        return /(已关注|好友|Following|Friends|Followed)/i.test(label);
    }

    /**
     * 打开当前个人主页的消息页面
     */
    async openProfileMessagePage() {
        const messageButton = this.findProfileMessageButton();
        if (!messageButton) {
            return { success: false, error: '未找到当前主页的消息按钮，可能对方未开放私信' };
        }

        messageButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await this.simulator.randomDelay(800, 1200);
        await this.simulator.smartClick(messageButton);
        await this.simulator.randomDelay(2500, 3500);

        const isMessagePage = /\/messages|\/chat|\/conversation/.test(window.location.href);
        if (!isMessagePage) {
            return { success: false, error: '点击消息按钮后未进入私信页面' };
        }

        return { success: true };
    }

    /**
     * 查找个人主页的消息按钮，排除左侧导航栏消息入口 (多策略)
     */
    findProfileMessageButton() {
        // 策略1: 用通用策略查找器
        const found = this.findElementByStrategies([
            { strategy: 'data-e2e', value: 'message-button' },
            { strategy: 'aria-label', value: '消息' },
            { strategy: 'aria-label', value: 'Message' },
            { strategy: 'css', value: this.selectors.sendMessageFromProfile }
        ]);
        if (found) {
            const rect = found.getBoundingClientRect();
            if (rect.x > 400) return found; // 确保不在左侧导航栏
        }

        // 策略2: 遍历所有元素按特征筛选 (兜底)
        const elements = Array.from(document.querySelectorAll('button, a[role="button"], div[role="button"], a'));
        const candidates = [];

        for (const element of elements) {
            if (!this.isElementVisible(element)) continue;

            const text = element.textContent?.trim() || '';
            const ariaLabel = element.getAttribute('aria-label') || '';
            const className = element.className || '';
            const href = element.getAttribute('href') || '';
            const label = `${text} ${ariaLabel} ${className}`;

            if (!/(消息|Message|message)/i.test(label)) continue;

            const rect = element.getBoundingClientRect();
            const isLeftNav = rect.x < 400 || href.includes('/messages') || element.closest('[data-e2e="nav-messages"]');
            const isProfileArea = rect.x > window.innerWidth * 0.35 && rect.y < window.innerHeight * 0.6;

            if (!isLeftNav && isProfileArea) {
                candidates.push({ element, x: rect.x, y: rect.y });
            }
        }

        candidates.sort((a, b) => b.x - a.x || a.y - b.y);
        return candidates[0]?.element || null;
    }

    /**
     * 在私信页填入草稿，但不点击发送
     */
    async fillMessageDraft(message) {
        await this.simulator.randomDelay(1200, 1800);

        const inputSelectors = [
            '.notranslate.public-DraftEditor-content[contenteditable="true"]',
            'div[contenteditable="true"][role="textbox"]',
            'div[aria-label*="发送消息"]',
            '[data-e2e="message-input"]',
            'div[contenteditable="true"]',
            '[role="textbox"]',
            '#placeholder-a99f2',
            '[placeholder*="消息"]',
            '[placeholder*="Message"]',
            'textarea[placeholder]',
            'input[type="text"]'
        ];

        let messageInput = null;
        for (const selector of inputSelectors) {
            const input = document.querySelector(selector);
            if (input && this.isElementVisible(input)) {
                messageInput = input;
                break;
            }
        }

        if (!messageInput) {
            return { success: false, error: '未找到私信输入框' };
        }

        messageInput.focus();
        await this.simulator.randomDelay(300, 600);

        if (messageInput.isContentEditable) {
            messageInput.textContent = message;
        } else {
            messageInput.value = message;
        }

        ['input', 'change', 'keyup'].forEach(eventType => {
            messageInput.dispatchEvent(new Event(eventType, { bubbles: true }));
        });

        return { success: true };
    }

    /**
     * 🎯 v1.3.1修正版：先点击对话框再进行后续操作
     */
    async performUltimatePasteSend(messageInput, message) {
        this.logger.info('🎯 启动v1.3.1修正版终极粘贴发送机制...');
        
        try {
            // 第一步：先点击对话框（用户强调的关键步骤）
            this.logger.info('📍 第一步：点击对话框激活编辑状态...');
            await this.clickDialogBox(messageInput);
            
            // 第二步：清空输入框内容
            this.logger.info('📍 第二步：清空输入框内容...');
            await this.clearInputContent(messageInput);
            
            // 第三步：点击输入框右侧边缘激活发送按钮
            this.logger.info('📍 第三步：点击输入框右侧边缘激活发送按钮...');
            await this.clickInputRightEdge(messageInput);
            
            // 第四步：复制内容到剪贴板并粘贴
            this.logger.info('📍 第四步：复制内容到剪贴板并粘贴...');
            await this.copyAndPasteMessage(messageInput, message);
            
            // 第五步：智能检测并点击发送按钮
            this.logger.info('📍 第五步：检测并点击发送按钮...');
            return await this.detectAndClickSendButton();
            
        } catch (error) {
            this.logger.error('❌ 终极粘贴发送过程中出现错误:', error);
            return false;
        }
    }
    
    /**
     * 📱 点击对话框激活编辑状态（v1.3.2增强版：处理表情符号面板）
     */
    async clickDialogBox(messageInput) {
        try {
            this.logger.info('👆 点击对话框激活编辑状态...');
            
            // 第一步：检查并关闭表情符号面板
            await this.closeEmojiPanel();
            
            // 第二步：点击整个输入框区域
            await this.simulator.smartClick(messageInput);
            await this.simulator.randomDelay(300, 500);
            
            // 第三步：确保输入框获得焦点
            messageInput.focus();
            await this.simulator.randomDelay(200, 400);
            
            // 第四步：触发focus事件确保Draft.js激活
            const focusEvent = new FocusEvent('focus', {
                bubbles: true,
                cancelable: true
            });
            messageInput.dispatchEvent(focusEvent);
            
            // 第五步：等待编辑器状态稳定
            await this.simulator.randomDelay(500, 800);
            
            this.logger.info('✅ 对话框已点击并激活编辑状态');
            
        } catch (error) {
            this.logger.warn('点击对话框失败:', error.message);
        }
    }
    
    /**
     * 😊 关闭表情符号面板（新增功能）
     */
    async closeEmojiPanel() {
        try {
            this.logger.debug('🔍 检查是否有表情符号面板打开...');
            
            // 查找表情符号面板的可能选择器
            const emojiPanelSelectors = [
                'div[class*="emoji"]',
                'div[class*="Emoji"]', 
                'div[aria-label*="emoji"]',
                'div[aria-label*="表情"]',
                'div[class*="suggestion-container"]',
                'div[id*="emoji"]',
                'div[class*="EmojiButton"]'
            ];
            
            let emojiPanel = null;
            let emojiButton = null;
            
            // 查找表情符号面板
            for (const selector of emojiPanelSelectors) {
                const elements = document.querySelectorAll(selector);
                for (const element of elements) {
                    const rect = element.getBoundingClientRect();
                    // 查找可见的、位置在下方的面板（表情符号面板通常在底部）
                    if (rect.height > 100 && rect.width > 200 && rect.y > window.innerHeight * 0.5) {
                        emojiPanel = element;
                        this.logger.debug(`找到表情符号面板: ${selector}`);
                        break;
                    }
                }
                if (emojiPanel) break;
            }
            
            // 查找表情符号按钮（用于关闭）
            const emojiButtonSelectors = [
                'button[class*="emoji"]',
                'button[aria-label*="emoji"]', 
                'button[aria-label*="表情"]',
                'div[class*="EmojiButton"]',
                'div[role="button"][class*="emoji"]'
            ];
            
            for (const selector of emojiButtonSelectors) {
                try {
                    const buttons = document.querySelectorAll(selector);
                    for (const btn of buttons) {
                        const rect = btn.getBoundingClientRect();
                        // 查找输入框附近的表情按钮
                        if (rect.width > 0 && rect.height > 0 && rect.y > window.innerHeight * 0.7) {
                            emojiButton = btn;
                            this.logger.debug(`找到表情符号按钮: ${selector}`);
                            break;
                        }
                    }
                    if (emojiButton) break;
                } catch (e) {
                    // 忽略选择器错误
                }
            }
            
            // 如果找到表情符号面板，尝试关闭
            if (emojiPanel || emojiButton) {
                this.logger.info('🔧 发现表情符号面板打开，尝试关闭...');
                
                if (emojiButton) {
                    // 点击表情按钮关闭面板
                    await this.simulator.smartClick(emojiButton);
                    this.logger.info('✅ 已点击表情按钮关闭面板');
                } else {
                    // 点击面板外的区域关闭
                    const clickX = 100;
                    const clickY = window.innerHeight * 0.3;
                    const clickEvent = new MouseEvent('click', {
                        view: window,
                        bubbles: true,
                        cancelable: true,
                        clientX: clickX,
                        clientY: clickY,
                        button: 0
                    });
                    document.elementFromPoint(clickX, clickY)?.dispatchEvent(clickEvent);
                    this.logger.info('✅ 已点击外部区域关闭表情面板');
                }
                
                // 等待面板关闭
                await this.simulator.randomDelay(500, 800);
            } else {
                this.logger.debug('✅ 未发现表情符号面板，继续操作');
            }
            
        } catch (error) {
            this.logger.warn('关闭表情符号面板失败:', error.message);
            // 不抛出错误，继续后续操作
        }
    }
    
    /**
     * 🧹 清空输入框内容
     */
    async clearInputContent(messageInput) {
        try {
            // 确保输入框有焦点
            messageInput.focus();
            await this.simulator.randomDelay(200, 400);
            
            // 选择所有内容
            const selectAllEvent = new KeyboardEvent('keydown', {
                key: 'a',
                code: 'KeyA',
                ctrlKey: true,
                bubbles: true,
                cancelable: true
            });
            messageInput.dispatchEvent(selectAllEvent);
            await this.simulator.randomDelay(100, 200);
            
            // 删除选中的内容
            const deleteEvent = new KeyboardEvent('keydown', {
                key: 'Delete',
                code: 'Delete',
                bubbles: true,
                cancelable: true
            });
            messageInput.dispatchEvent(deleteEvent);
            
            // 直接清空textContent作为备选
            messageInput.textContent = '';
            
            // 触发清空事件
            const inputEvent = new Event('input', { bubbles: true });
            messageInput.dispatchEvent(inputEvent);
            
            this.logger.debug('✅ 输入框内容已清空');
            
        } catch (error) {
            this.logger.warn('清空输入框失败:', error.message);
        }
    }
    
    /**
     * 👆 点击输入框右侧边缘（Chrome MCP验证的关键发现）
     */
    async clickInputRightEdge(messageInput) {
        try {
            const rect = messageInput.getBoundingClientRect();
            
            // Chrome MCP验证：点击右侧边缘前20px的位置
            const rightX = rect.right - 20;
            const centerY = rect.top + rect.height / 2;
            
            this.logger.debug(`点击输入框右侧边缘位置: (${rightX}, ${centerY})`);
            
            // 创建完整的鼠标事件序列
            const events = [
                new MouseEvent('mousedown', {
                    view: window,
                    bubbles: true,
                    cancelable: true,
                    clientX: rightX,
                    clientY: centerY,
                    button: 0
                }),
                new MouseEvent('click', {
                    view: window,
                    bubbles: true,
                    cancelable: true,
                    clientX: rightX,
                    clientY: centerY,
                    button: 0
                }),
                new MouseEvent('mouseup', {
                    view: window,
                    bubbles: true,
                    cancelable: true,
                    clientX: rightX,
                    clientY: centerY,
                    button: 0
                })
            ];
            
            // 发送事件序列
            for (const event of events) {
                messageInput.dispatchEvent(event);
                await this.simulator.randomDelay(50, 100);
            }
            
            this.logger.info('✅ 右侧边缘点击完成，发送按钮应该已激活');
            
        } catch (error) {
            this.logger.warn('点击输入框右侧边缘失败:', error.message);
        }
    }
    
    /**
     * 📋 增强版消息输入（v1.3.3：模拟手动输入激活发送按钮）
     */
    async copyAndPasteMessage(messageInput, message) {
        try {
            this.logger.debug('开始增强版消息输入，模拟手动输入激活发送按钮...');
            
            // 确保输入框完全激活
            messageInput.focus();
            await this.simulator.randomDelay(200, 400);
            
            // 方法1: 模拟逐字符输入（更接近手动操作）
            await this.simulateTypingInput(messageInput, message);
            
            // 方法2: 如果逐字符输入失败，使用增强粘贴
            const currentContent = messageInput.textContent || '';
            if (currentContent.trim() !== message.trim()) {
                this.logger.warn('逐字符输入可能失败，尝试增强粘贴方案...');
                await this.performEnhancedPaste(messageInput, message);
            }
            
            // 等待并验证发送按钮是否出现
            await this.waitForSendButtonActivation();
            
        } catch (error) {
            this.logger.error('消息输入失败:', error);
            throw error;
        }
    }
    
    /**
     * ⌨️ 模拟逐字符手动输入（激活发送按钮的关键）
     */
    async simulateTypingInput(messageInput, message) {
        try {
            this.logger.debug('开始模拟逐字符手动输入...');
            
            // 确保输入框为空且有焦点
            messageInput.textContent = '';
            messageInput.focus();
            await this.simulator.randomDelay(200, 400);
            
            // 逐字符输入，每个字符触发完整事件序列
            for (let i = 0; i < message.length; i++) {
                const char = message[i];
                const charCode = char.charCodeAt(0);
                
                // 创建键盘事件
                const keydownEvent = new KeyboardEvent('keydown', {
                    key: char,
                    code: this.getKeyCode(char),
                    keyCode: charCode,
                    which: charCode,
                    bubbles: true,
                    cancelable: true
                });
                
                const keypressEvent = new KeyboardEvent('keypress', {
                    key: char,
                    code: this.getKeyCode(char), 
                    keyCode: charCode,
                    which: charCode,
                    charCode: charCode,
                    bubbles: true,
                    cancelable: true
                });
                
                // 发送keydown和keypress事件
                messageInput.dispatchEvent(keydownEvent);
                messageInput.dispatchEvent(keypressEvent);
                
                // 如果事件没有被阻止，更新内容
                if (!keydownEvent.defaultPrevented && !keypressEvent.defaultPrevented) {
                    const currentText = messageInput.textContent || '';
                    messageInput.textContent = currentText + char;
                    
                    // 触发input事件
                    const inputEvent = new InputEvent('input', {
                        inputType: 'insertText',
                        data: char,
                        bubbles: true,
                        cancelable: false
                    });
                    messageInput.dispatchEvent(inputEvent);
                }
                
                // keyup事件
                const keyupEvent = new KeyboardEvent('keyup', {
                    key: char,
                    code: this.getKeyCode(char),
                    keyCode: charCode,
                    which: charCode,
                    bubbles: true,
                    cancelable: true
                });
                messageInput.dispatchEvent(keyupEvent);
                
                // 随机延迟模拟真实打字速度
                await this.simulator.randomDelay(50, 150);
            }
            
            this.logger.info('✅ 逐字符输入完成');
            
        } catch (error) {
            this.logger.warn('逐字符输入失败:', error.message);
            throw error;
        }
    }
    
    /**
     * 🔤 获取字符对应的KeyCode
     */
    getKeyCode(char) {
        if (char >= 'a' && char <= 'z') {
            return 'Key' + char.toUpperCase();
        } else if (char >= 'A' && char <= 'Z') {
            return 'Key' + char;
        } else if (char >= '0' && char <= '9') {
            return 'Digit' + char;
        } else {
            // 特殊字符的映射
            const specialKeys = {
                ' ': 'Space',
                '!': 'Digit1',
                '~': 'Backquote',
                '✨': 'Space' // emoji默认使用Space
            };
            return specialKeys[char] || 'Space';
        }
    }
    
    /**
     * 📋 增强版粘贴（备选方案）
     */
    async performEnhancedPaste(messageInput, message) {
        try {
            this.logger.debug('执行增强版粘贴...');
            
            // 使用现代Clipboard API
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(message);
                await this.simulator.randomDelay(200, 400);
                
                // 模拟Ctrl+V
                const pasteKeydown = new KeyboardEvent('keydown', {
                    key: 'v', code: 'KeyV', ctrlKey: true,
                    bubbles: true, cancelable: true
                });
                const pasteKeyup = new KeyboardEvent('keyup', {
                    key: 'v', code: 'KeyV', ctrlKey: true,
                    bubbles: true, cancelable: true
                });
                
                messageInput.dispatchEvent(pasteKeydown);
                await this.simulator.randomDelay(50, 100);
                messageInput.dispatchEvent(pasteKeyup);
            } else {
                // 备选方案
                messageInput.textContent = message;
                const inputEvent = new InputEvent('input', {
                    inputType: 'insertFromPaste',
                    data: message,
                    bubbles: true
                });
                messageInput.dispatchEvent(inputEvent);
            }
            
            this.logger.info('✅ 增强版粘贴完成');
            
        } catch (error) {
            this.logger.warn('增强版粘贴失败:', error.message);
        }
    }
    
    /**
     * ⏳ 等待发送按钮激活
     */
    async waitForSendButtonActivation() {
        try {
            this.logger.debug('等待发送按钮激活...');
            
            let activated = false;
            let attempts = 0;
            const maxAttempts = 10;
            
            while (!activated && attempts < maxAttempts) {
                attempts++;
                
                // 检查是否有红色发送按钮出现
                const sendButtons = document.querySelectorAll('svg, button');
                for (const btn of sendButtons) {
                    const rect = btn.getBoundingClientRect();
                    if (rect.x > 1100 && rect.y > 850 && rect.y < 900 && rect.width > 0) {
                        // 检查按钮颜色或样式（红色发送按钮的特征）
                        const styles = window.getComputedStyle(btn);
                        const parent = btn.parentElement;
                        const parentStyles = parent ? window.getComputedStyle(parent) : null;
                        
                        if (styles.color.includes('rgb') || 
                            styles.fill.includes('rgb') ||
                            (parentStyles && (parentStyles.backgroundColor.includes('rgb') || 
                                            parentStyles.color.includes('rgb')))) {
                            activated = true;
                            this.logger.info(`✅ 发送按钮已激活！位置:(${Math.round(rect.x)}, ${Math.round(rect.y)})`);
                            break;
                        }
                    }
                }
                
                if (!activated) {
                    this.logger.debug(`⏳ 等待发送按钮激活... 尝试 ${attempts}/${maxAttempts}`);
                    await this.simulator.randomDelay(500, 1000);
                }
            }
            
            if (!activated) {
                this.logger.warn('⚠️ 发送按钮可能未完全激活，但继续尝试发送...');
            }
            
        } catch (error) {
            this.logger.warn('等待发送按钮激活失败:', error.message);
        }
    }
    
    /**
     * 🔍 检测并点击发送按钮（Chrome MCP验证坐标）
     */
    async detectAndClickSendButton() {
        try {
            let sendButton = null;
            let attempts = 0;
            const maxAttempts = 10;
            
            // 循环检测发送按钮
            while (!sendButton && attempts < maxAttempts) {
                attempts++;
                
                // 使用Chrome MCP验证的精确坐标范围
                const svgElements = document.querySelectorAll('svg');
                
                for (const svg of svgElements) {
                    const rect = svg.getBoundingClientRect();
                    
                    // Chrome MCP验证：发送按钮位置(1115, 867)，24x24大小
                    if (rect.x >= 1100 && rect.x <= 1130 && 
                        rect.y >= 850 && rect.y <= 890 && 
                        rect.width >= 20 && rect.height >= 20) {
                        
                        sendButton = svg;
                        this.logger.info(`✅ 找到发送按钮: 坐标(${Math.round(rect.x)}, ${Math.round(rect.y)}) 大小${Math.round(rect.width)}x${Math.round(rect.height)}`);
                        break;
                    }
                }
                
                if (!sendButton) {
                    this.logger.debug(`⏳ 等待发送按钮出现... 尝试 ${attempts}/${maxAttempts}`);
                    await this.simulator.randomDelay(500, 1000);
                }
            }
            
            if (!sendButton) {
                this.logger.error('❌ 未找到发送按钮，可能需要先输入内容或点击正确位置');
                return false;
            }
            
            // Chrome MCP验证成功的点击方法
            const rect = sendButton.getBoundingClientRect();
            const centerX = rect.x + rect.width / 2;
            const centerY = rect.y + rect.height / 2;
            
            // 创建真实的点击事件
            const clickEvent = new MouseEvent('click', {
                view: window,
                bubbles: true,
                cancelable: true,
                clientX: centerX,
                clientY: centerY,
                button: 0
            });
            
            sendButton.dispatchEvent(clickEvent);
            
            // 等待发送完成
            await this.simulator.randomDelay(1000, 2000);
            
            this.logger.info('🎉 消息发送完成！');
            return true;
            
        } catch (error) {
            this.logger.error('❌ 检测和点击发送按钮失败:', error);
            return false;
        }
    }
    
    /**
     * 🔔 显示用户输入提示
     */
    showUserInputPrompt(message) {
        // 创建浮动提示框
        const promptDiv = document.createElement('div');
        promptDiv.id = 'tiktok-input-prompt';
        promptDiv.innerHTML = `
            <div style="
                position: fixed; 
                top: 50%; 
                left: 50%; 
                transform: translate(-50%, -50%);
                background: linear-gradient(135deg, #ff6b6b, #4ecdc4);
                color: white;
                padding: 20px;
                border-radius: 15px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                z-index: 10000;
                font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                text-align: center;
                animation: fadeIn 0.3s ease-out;
                max-width: 400px;
            ">
                <h3 style="margin: 0 0 10px 0; font-size: 18px;">🤖 TikTok智能助手</h3>
                <p style="margin: 0 0 15px 0; font-size: 14px; opacity: 0.9;">
                    输入框已激活！请手动输入以下内容：
                </p>
                <div style="
                    background: rgba(255,255,255,0.2);
                    padding: 12px;
                    border-radius: 8px;
                    margin: 10px 0;
                    font-size: 16px;
                    font-weight: bold;
                ">
                    "${message}"
                </div>
                <p style="margin: 15px 0 0 0; font-size: 12px; opacity: 0.8;">
                    输入完成后，插件会自动检测并发送消息
                </p>
            </div>
            <style>
                @keyframes fadeIn {
                    from { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                    to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                }
            </style>
        `;
        
        document.body.appendChild(promptDiv);
        
        // 5秒后自动隐藏提示
        setTimeout(() => {
            const prompt = document.getElementById('tiktok-input-prompt');
            if (prompt) {
                prompt.style.animation = 'fadeOut 0.3s ease-in';
                setTimeout(() => prompt.remove(), 300);
            }
        }, 5000);
    }
    
    /**
     * 🔍 智能监控发送按钮
     */
    async startSendButtonMonitor(message) {
        const maxMonitorTime = 30000; // 30秒监控时间
        const checkInterval = 1000; // 每秒检查一次
        let monitorTime = 0;
        
        this.logger.info('🔍 开始监控发送按钮出现...');
        
        return new Promise((resolve) => {
            const monitor = setInterval(async () => {
                try {
                    monitorTime += checkInterval;
                    
                    // 检查是否超时
                    if (monitorTime > maxMonitorTime) {
                        clearInterval(monitor);
                        this.logger.warn('⏰ 监控超时，用户可能需要手动发送');
                        resolve(false);
                        return;
                    }
                    
                    // 使用Chrome MCP验证的发送按钮检测逻辑
                    const sendButton = await this.findSendButton();
                    
                    if (sendButton) {
                        clearInterval(monitor);
                        this.logger.info('✅ 检测到发送按钮！准备自动发送...');
                        
                        // 移除提示框
                        const prompt = document.getElementById('tiktok-input-prompt');
                        if (prompt) prompt.remove();
                        
                        // 等待一小段时间确保用户输入完成
                        await this.simulator.randomDelay(1000, 2000);
                        
                        // 自动点击发送按钮
                        const success = await this.clickSendButton(sendButton);
                        resolve(success);
                    }
                    
                } catch (error) {
                    this.logger.error('监控过程中出现错误:', error);
                }
                
            }, checkInterval);
        });
    }
    
    /**
     * 🔍 使用Chrome MCP验证的发送按钮查找逻辑
     */
    async findSendButton() {
        const sendButtonSelectors = [
            'svg[width="24"][height="24"]', // 飞机图标的SVG
            'div[class*="MessageInputAndSendButton"] svg',
            'div[class*="ChatBottom"] svg',
            'button[aria-label*="发送"] svg',
            'button[aria-label*="Send"] svg',
            'path' // 飞机图标的path元素
        ];
        
        for (const selector of sendButtonSelectors) {
            try {
                const buttons = document.querySelectorAll(selector);
                for (const btn of buttons) {
                    const rect = btn.getBoundingClientRect();
                    // Chrome MCP验证：发送按钮在右侧，Y坐标在850-900之间，X坐标>1100
                    if (rect.x > 1100 && rect.y > 850 && rect.y < 900 && rect.width > 0 && rect.height > 0) {
                        this.logger.debug(`找到发送按钮：坐标(${Math.round(rect.x)}, ${Math.round(rect.y)})`);
                        return btn;
                    }
                }
            } catch (e) {
                // 忽略选择器错误，继续下一个
            }
        }
        
        return null;
    }
    
    /**
     * 🚀 使用Chrome MCP验证的发送按钮点击
     */
    async clickSendButton(sendButton) {
        try {
            this.logger.info('🚀 自动点击发送按钮...');
            
            // 使用Chrome MCP验证成功的坐标点击方法
            const rect = sendButton.getBoundingClientRect();
            const centerX = rect.x + rect.width / 2;
            const centerY = rect.y + rect.height / 2;
            
            // 模拟真实点击
            const clickEvent = new MouseEvent('click', {
                view: window,
                bubbles: true,
                cancelable: true,
                clientX: centerX,
                clientY: centerY,
                button: 0
            });
            
            sendButton.dispatchEvent(clickEvent);
            
            // 等待发送完成
            await this.simulator.randomDelay(1000, 2000);
            
            this.logger.info('🎉 消息自动发送完成！');
            return true;
            
        } catch (error) {
            this.logger.error('❌ 发送按钮点击失败:', error);
            return false;
        }
    }
    
    /**
     * 🎯 TikTok Draft.js 专用发送机制 (已弃用，使用两步发送)
     */
    async sendMessageToDraftJS(messageInput, message) {
        // 优先使用Chrome MCP验证的两步发送机制
        return await this.performTwoStepSend(messageInput, message);
    }
    
    /**
     * 🎯 备用：完整内容输入发送机制
     */
    async sendMessageToDraftJSOld(messageInput, message) {
        this.logger.info('🎯 检测到TikTok Draft.js编辑器，使用专用发送机制...');
        
        try {
            // 1. 确保输入框有焦点
            messageInput.focus();
            await this.simulator.randomDelay(500, 800);
            
            // 2. 清空现有内容
            const selectAllEvent = new KeyboardEvent('keydown', {
                key: 'a',
                code: 'KeyA',
                ctrlKey: true,
                bubbles: true,
                cancelable: true
            });
            messageInput.dispatchEvent(selectAllEvent);
            await this.simulator.randomDelay(100, 200);
            
            // 3. Draft.js专用输入事件
            this.logger.debug('开始Draft.js文本输入...');
            
            // 创建输入事件来插入文本
            const beforeInputEvent = new InputEvent('beforeinput', {
                inputType: 'insertText',
                data: message,
                bubbles: true,
                cancelable: true
            });
            messageInput.dispatchEvent(beforeInputEvent);
            
            // 直接设置内容到contenteditable
            messageInput.textContent = message;
            
            // 触发input事件
            const inputEvent = new InputEvent('input', {
                inputType: 'insertText',
                data: message,
                bubbles: true,
                cancelable: true
            });
            messageInput.dispatchEvent(inputEvent);
            
            await this.simulator.randomDelay(800, 1200);
            
            // 4. Draft.js专用Enter键发送
            this.logger.debug('执行Draft.js Enter键发送...');
            
            // 创建完整的键盘事件序列
            const keyEvents = [
                new KeyboardEvent('keydown', {
                    key: 'Enter',
                    code: 'Enter',
                    keyCode: 13,
                    which: 13,
                    bubbles: true,
                    cancelable: true
                }),
                new KeyboardEvent('keypress', {
                    key: 'Enter',
                    code: 'Enter',
                    keyCode: 13,
                    which: 13,
                    charCode: 13,
                    bubbles: true,
                    cancelable: true
                }),
                new KeyboardEvent('keyup', {
                    key: 'Enter',
                    code: 'Enter',
                    keyCode: 13,
                    which: 13,
                    bubbles: true,
                    cancelable: true
                })
            ];
            
            for (const event of keyEvents) {
                messageInput.dispatchEvent(event);
                await this.simulator.randomDelay(50, 100);
            }
            
            // 5. 额外的TikTok特定事件
            const compositionEndEvent = new CompositionEvent('compositionend', {
                data: message,
                bubbles: true,
                cancelable: true
            });
            messageInput.dispatchEvent(compositionEndEvent);
            
            await this.simulator.randomDelay(1500, 2000);
            
            this.logger.info('✅ Draft.js专用发送完成');
            return true;
            
        } catch (error) {
            this.logger.error('❌ Draft.js发送失败:', error);
            return false;
        }
    }

    /**
     * 🎯 终极消息发送方案 - 8种发送策略（新增Draft.js支持）
     */
    async performUltimateSend(messageInput, sendButton, message) {
        this.logger.info('🚀 启动终极发送方案...');
        
        // 🎯 首先检测是否为Draft.js编辑器
        const isDraftJS = messageInput.classList.contains('public-DraftEditor-content') || 
                         messageInput.closest('.DraftEditor-root') !== null ||
                         messageInput.getAttribute('contenteditable') === 'true';
                         
        this.logger.debug(`输入框类型检测: ${isDraftJS ? 'Draft.js编辑器' : '普通输入框'}`);
        
        if (isDraftJS) {
            this.logger.info('🎯 检测到TikTok Draft.js编辑器，使用v1.3.0终极粘贴发送机制');
            return await this.performUltimatePasteSend(messageInput, message);
        }
        
        const strategies = [
            // 策略1: 智能发送按钮点击
            async () => {
                if (!sendButton) return false;
                this.logger.info('📍 策略1: 智能发送按钮点击');
                try {
                    await this.simulator.simulateRealClick(sendButton);
                    await this.simulator.randomDelay(1000, 1500);
                    return true;
                } catch (e) {
                    this.logger.warn('策略1失败:', e.message);
                    return false;
                }
            },

            // 策略2: 增强版回车键
            async () => {
                this.logger.info('📍 策略2: 增强版回车键');
                try {
                    messageInput.focus();
                    await this.simulator.simulateEnterKey(messageInput);
                    await this.simulator.randomDelay(1000, 1500);
                    return true;
                } catch (e) {
                    this.logger.warn('策略2失败:', e.message);
                    return false;
                }
            },

            // 策略3: Shift+Enter组合键（某些聊天应用的发送快捷键）
            async () => {
                this.logger.info('📍 策略3: Shift+Enter组合键');
                try {
                    messageInput.focus();
                    const shiftEnterEvent = new KeyboardEvent('keydown', {
                        key: 'Enter',
                        code: 'Enter',
                        shiftKey: true,
                        bubbles: true,
                        cancelable: true
                    });
                    messageInput.dispatchEvent(shiftEnterEvent);
                    await this.simulator.randomDelay(1000, 1500);
                    return true;
                } catch (e) {
                    this.logger.warn('策略3失败:', e.message);
                    return false;
                }
            },

            // 策略4: 直接操作TikTok发送事件
            async () => {
                this.logger.info('📍 策略4: 直接操作TikTok发送事件');
                try {
                    // 触发TikTok特有的消息发送事件
                    const customEvent = new CustomEvent('tiktok:sendMessage', {
                        detail: { message: message },
                        bubbles: true
                    });
                    messageInput.dispatchEvent(customEvent);
                    
                    // 也尝试React/Vue的事件
                    const reactEvent = new CustomEvent('reactSendMessage', {
                        detail: { value: message },
                        bubbles: true
                    });
                    messageInput.dispatchEvent(reactEvent);
                    
                    await this.simulator.randomDelay(1000, 1500);
                    return true;
                } catch (e) {
                    this.logger.warn('策略4失败:', e.message);
                    return false;
                }
            },

            // 策略5: 暴力DOM操作 + 输入事件触发
            async () => {
                this.logger.info('📍 策略5: 暴力DOM操作 + 输入事件触发');
                try {
                    // 清空并重新输入
                    messageInput.innerHTML = '';
                    messageInput.textContent = '';
                    messageInput.innerText = message;
                    messageInput.value = message;
                    
                    // 触发完整的输入事件序列
                    const events = ['focus', 'input', 'change', 'keyup', 'blur'];
                    for (const eventType of events) {
                        const event = new Event(eventType, { bubbles: true });
                        messageInput.dispatchEvent(event);
                        await this.simulator.randomDelay(50, 100);
                    }
                    
                    // 最后尝试回车
                    const enterEvent = new KeyboardEvent('keydown', {
                        key: 'Enter',
                        keyCode: 13,
                        bubbles: true
                    });
                    messageInput.dispatchEvent(enterEvent);
                    
                    await this.simulator.randomDelay(1000, 1500);
                    return true;
                } catch (e) {
                    this.logger.warn('策略5失败:', e.message);
                    return false;
                }
            },

            // 策略6: 寻找隐藏的提交按钮并点击
            async () => {
                this.logger.info('📍 策略6: 寻找隐藏的提交按钮');
                try {
                    // 查找父级容器中的所有可能按钮
                    const container = messageInput.closest('[data-e2e*="message"], .message-container, form') || messageInput.parentElement;
                    const allButtons = container?.querySelectorAll('button, input[type="submit"], [role="button"]') || [];
                    
                    for (const btn of allButtons) {
                        const computedStyle = window.getComputedStyle(btn);
                        // 即使是隐藏按钮也尝试点击
                        if (btn.type === 'submit' || 
                            btn.className.includes('send') || 
                            btn.getAttribute('aria-label')?.includes('send') ||
                            computedStyle.cursor === 'pointer') {
                            
                            this.logger.debug(`尝试点击隐藏按钮: ${btn.outerHTML.substring(0, 100)}`);
                            btn.click();
                            await this.simulator.randomDelay(500, 1000);
                        }
                    }
                    
                    await this.simulator.randomDelay(1000, 1500);
                    return true;
                } catch (e) {
                    this.logger.warn('策略6失败:', e.message);
                    return false;
                }
            },

            // 策略7: 终极剪贴板模拟发送
            async () => {
                this.logger.info('📍 策略7: 终极剪贴板模拟发送');
                try {
                    // 选中所有内容
                    messageInput.focus();
                    messageInput.select();
                    if (messageInput.setSelectionRange) {
                        messageInput.setSelectionRange(0, messageInput.value.length);
                    }
                    
                    // 模拟Ctrl+A选择所有
                    const selectAllEvent = new KeyboardEvent('keydown', {
                        key: 'a',
                        ctrlKey: true,
                        bubbles: true
                    });
                    messageInput.dispatchEvent(selectAllEvent);
                    
                    await this.simulator.randomDelay(200, 300);
                    
                    // 删除现有内容
                    const deleteEvent = new KeyboardEvent('keydown', {
                        key: 'Delete',
                        bubbles: true
                    });
                    messageInput.dispatchEvent(deleteEvent);
                    
                    await this.simulator.randomDelay(200, 300);
                    
                    // 逐字符输入（最真实的方式）
                    for (const char of message) {
                        const keyDownEvent = new KeyboardEvent('keydown', {
                            key: char,
                            bubbles: true
                        });
                        const inputEvent = new InputEvent('input', {
                            data: char,
                            bubbles: true
                        });
                        const keyUpEvent = new KeyboardEvent('keyup', {
                            key: char,
                            bubbles: true
                        });
                        
                        messageInput.dispatchEvent(keyDownEvent);
                        messageInput.value += char;
                        messageInput.textContent += char;
                        messageInput.dispatchEvent(inputEvent);
                        messageInput.dispatchEvent(keyUpEvent);
                        
                        await this.simulator.randomDelay(50, 150); // 真实打字速度
                    }
                    
                    await this.simulator.randomDelay(500, 800);
                    
                    // 最终发送
                    const finalEnter = new KeyboardEvent('keydown', {
                        key: 'Enter',
                        keyCode: 13,
                        bubbles: true,
                        cancelable: true
                    });
                    messageInput.dispatchEvent(finalEnter);
                    
                    await this.simulator.randomDelay(1000, 1500);
                    return true;
                } catch (e) {
                    this.logger.warn('策略7失败:', e.message);
                    return false;
                }
            }
        ];

        // 依次尝试所有策略
        for (let i = 0; i < strategies.length; i++) {
            try {
                this.logger.info(`🔄 尝试发送策略 ${i + 1}/${strategies.length}`);
                const result = await strategies[i]();
                
                if (result) {
                    // 验证发送是否成功（检查输入框是否被清空）
                    await this.simulator.randomDelay(1000, 2000);
                    const inputValue = messageInput.value || messageInput.textContent || messageInput.innerText || '';
                    const wasCleared = inputValue.trim().length < message.length / 2; // 如果内容显著减少，认为可能发送成功
                    
                    if (wasCleared) {
                        this.logger.info(`🎉 策略${i + 1}发送成功！输入框已清空`);
                        return true;
                    } else {
                        this.logger.debug(`策略${i + 1}执行完成，但输入框未清空，继续尝试...`);
                    }
                } else {
                    this.logger.debug(`策略${i + 1}执行失败，继续尝试...`);
                }
                
            } catch (error) {
                this.logger.warn(`策略${i + 1}异常:`, error.message);
            }
        }

        this.logger.error('❌ 所有7种发送策略都失败了');
        return false;
    }

    /**
     * 发送问候消息的完整流程（修复版）
     */
    async sendGreetingMessage() {
        try {
            this.logger.info('📝 开始发送问候消息流程...');

            // 第一步：在个人主页寻找发送消息按钮
            let sendMessageButton = document.querySelector(this.selectors.sendMessageFromProfile);
            
            // 如果主要选择器没找到，尝试备选方案
            if (!sendMessageButton) {
                const backupSelectors = [
                    'button[data-e2e="message-button"]',
                    'button[aria-label*="消息"]',
                    'button[aria-label*="Message"]',
                    '[aria-label*="消息"]',
                    '[aria-label*="Message"]'
                ];

                for (const selector of backupSelectors) {
                    sendMessageButton = document.querySelector(selector);
                    if (sendMessageButton) {
                        this.logger.debug(`使用备选消息按钮: ${selector}`);
                        break;
                    }
                }
            }

            // 尝试通过文本内容查找
            if (!sendMessageButton) {
                const allButtons = document.querySelectorAll('button, a[role="button"]');
                for (const button of allButtons) {
                    const text = button.textContent?.trim();
                    if (text && (text === '消息' || text === 'Message')) {
                        sendMessageButton = button;
                        this.logger.debug('通过文本内容找到消息按钮');
                        break;
                    }
                }
            }

            if (!sendMessageButton) {
                this.logger.warn('未找到个人主页的发送消息按钮');
                return false;
            }

            this.logger.info('📨 找到发送消息按钮，点击进入对话...');
            await this.simulator.simulateRealClick(sendMessageButton);
            await this.simulator.randomDelay(3000, 5000); // 等待对话界面加载

            // 第二步：查找对话输入框
            let chatInput = document.querySelector(this.selectors.chatInputBox);

            // 如果主要输入框没找到，尝试其他输入框选择器
            if (!chatInput) {
                const inputSelectors = [
                    // DraftEditor相关选择器
                    '.DraftEditor-editorContainer [contenteditable="true"]',
                    '.DraftEditor-root [contenteditable="true"]',
                    '[data-text="true"]',
                    
                    // 通用输入框选择器
                    '#main-content-messages textarea',
                    '#main-content-messages input[type="text"]',
                    '#main-content-messages [contenteditable="true"]',
                    
                    // 备用选择器
                    'textarea[placeholder*="消息"]',
                    'div[contenteditable="true"]',
                    '[role="textbox"]',
                    
                    // 原有的输入框选择器
                    this.selectors.messageInput
                ];

                for (const selector of inputSelectors) {
                    chatInput = document.querySelector(selector);
                    if (chatInput && this.isElementVisible(chatInput)) {
                        this.logger.debug(`使用输入框: ${selector}`);
                        break;
                    }
                }
            }

            if (!chatInput) {
                this.logger.error('未找到对话输入框');
                return false;
            }

            this.logger.info('⌨️ 找到对话输入框，准备输入问候消息...');

            // 第三步：输入问候消息
            const greetingMessage = this.config.autoFollow.welcomeMessage || '你好！感谢关注，很高兴认识你！😊';
            
            // 聚焦输入框
            await this.simulator.simulateRealClick(chatInput);
            await this.simulator.randomDelay(500, 1000);

            // 处理不同类型的输入框
            let inputSuccess = false;

            if (chatInput.contentEditable === 'true') {
                // 处理contenteditable的输入框（如DraftEditor）
                this.logger.debug('使用contenteditable输入方式');
                inputSuccess = await this.simulateTypingInContentEditable(chatInput, greetingMessage);
            } else {
                // 处理传统的textarea或input
                this.logger.debug('使用传统input输入方式');
                inputSuccess = await this.simulator.simulateTyping(
                    chatInput,
                    greetingMessage,
                    this.config.autoReply.typingSpeed || 'normal'
                );
            }

            if (!inputSuccess) {
                this.logger.error('输入问候消息失败');
                return false;
            }

            // 第四步：发送消息
            await this.simulator.randomDelay(1000, 1500);
            
            // 尝试按Enter发送
            await this.simulator.simulateEnterKey(chatInput);
            
            // 也尝试寻找发送按钮
            const sendButton = document.querySelector('button[data-e2e="send-button"], button[aria-label*="发送"], button[aria-label*="Send"]');
            if (sendButton) {
                await this.simulator.randomDelay(500, 1000);
                await this.simulator.simulateRealClick(sendButton);
            }

            this.logger.info('✅ 问候消息发送完成');
            return true;

        } catch (error) {
            this.logger.error('发送问候消息失败:', error);
            return false;
        }
    }

    /**
     * 在contenteditable元素中模拟打字
     */
    async simulateTypingInContentEditable(element, text) {
        try {
            const speedConfig = this.simulator.config.typingSpeed.normal;
            
            // 逐字符输入到contenteditable
            for (let i = 0; i < text.length; i++) {
                const char = text[i];
                
                // 插入字符
                element.textContent += char;
                
                // 触发输入事件
                const inputEvent = new Event('input', { bubbles: true });
                element.dispatchEvent(inputEvent);
                
                // 更新光标位置
                const range = document.createRange();
                const selection = window.getSelection();
                
                if (element.childNodes.length > 0) {
                    range.setStart(element.childNodes[0], element.textContent.length);
                    range.setEnd(element.childNodes[0], element.textContent.length);
                } else {
                    range.selectNodeContents(element);
                }
                
                selection.removeAllRanges();
                selection.addRange(range);
                
                // 随机延时
                const delay = this.simulator.randomBetween(speedConfig.min, speedConfig.max);
                await this.simulator.sleep(delay);
            }
            
            // 触发最终事件
            const changeEvent = new Event('change', { bubbles: true });
            element.dispatchEvent(changeEvent);
            
            return true;
        } catch (error) {
            this.logger.error('contenteditable输入失败:', error);
            return false;
        }
    }

    /**
     * 异步测试函数
     */
    async testFunctionAsync() {
        try {
            this.logger.info('🧪 开始功能测试...');

            // 页面基础信息
            const pageInfo = {
                url: window.location.href,
                domain: window.location.hostname,
                title: document.title,
                readyState: document.readyState
            };

            // 测试各种元素是否存在
            const elementTests = {};
            for (const [key, selector] of Object.entries(this.selectors)) {
                try {
                    const element = document.querySelector(selector);
                    elementTests[key] = {
                        found: !!element,
                        selector: selector,
                        visible: element ? this.isElementVisible(element) : false
                    };
                } catch (e) {
                    elementTests[key] = {
                        found: false,
                        selector: selector,
                        error: e.message
                    };
                }
            }

            // 通用元素检测
            const genericElements = {
                anySupElements: document.querySelectorAll('sup').length,
                anyRedDots: document.querySelectorAll('[class*="red"], [class*="Red"], [class*="notification"], [class*="unread"]').length,
                anyButtons: document.querySelectorAll('button').length,
                anyInputs: document.querySelectorAll('input, textarea').length
            };

            const testResults = {
                timestamp: new Date().toLocaleString(),
                pageInfo: pageInfo,
                pageValid: this.isValidTikTokPage(),
                elementTests: elementTests,
                genericElements: genericElements,
                configLoaded: !!this.config,
                simulatorReady: !!this.simulator,
                totalFoundElements: Object.values(elementTests).filter(test => test.found).length,
                totalElements: Object.keys(elementTests).length
            };

            this.logger.info('🧪 测试结果详情:', testResults);

            // 生成测试总结
            const summary = `页面验证: ${testResults.pageValid ? '✅' : '❌'} | 找到元素: ${testResults.totalFoundElements}/${testResults.totalElements} | 通用元素: sup(${genericElements.anySupElements}) 按钮(${genericElements.anyButtons})`;

            return {
                success: true,
                results: testResults,
                summary: summary
            };

        } catch (error) {
            this.logger.error('功能测试失败:', error);
            return {
                success: false,
                error: error.message,
                summary: '测试过程出现错误'
            };
        }
    }

    /**
     * 检查元素是否可见
     */
    isElementVisible(element) {
        if (!element) return false;
        
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        
        return (
            rect.width > 0 &&
            rect.height > 0 &&
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0'
        );
    }

    /**
     * 检查按钮是否在通知项内
     */
    isButtonInNotificationItem(button) {
        let current = button;
        let level = 0;
        const maxLevel = 10;

        while (current && level < maxLevel) {
            // 检查是否包含关注相关文本
            if (current.textContent && current.textContent.includes('关注了你')) {
                return true;
            }
            
            // 检查是否有通知项的特征
            if (current.querySelector && (
                current.querySelector('img') || // 头像
                current.querySelector('[data-e2e="avatar"]') ||
                current.querySelector('.avatar')
            )) {
                const hasFollowText = current.textContent && 
                    (current.textContent.includes('关注了你') || 
                     current.textContent.includes('followed you'));
                if (hasFollowText) {
                    return true;
                }
            }
            
            current = current.parentElement;
            level++;
        }
        
        return false;
    }

    /**
     * 设置页面观察器
     */
    setupPageObserver() {
        // 观察DOM变化
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    // 页面内容发生变化，清理已处理元素集合
                    this.cleanupProcessedElements();
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        this.pageObserver = observer;
    }

    /**
     * 清理已处理元素集合
     */
    cleanupProcessedElements() {
        const elementsToRemove = [];
        
        for (const element of this.processedElements) {
            if (!document.contains(element)) {
                elementsToRemove.push(element);
            }
        }

        elementsToRemove.forEach(element => {
            this.processedElements.delete(element);
        });
    }

    /**
     * 更新统计数据
     */
    async updateStats(type) {
        this.stats[type + 'Count']++;
        this.stats.messageCount++;

        try {
            const config = await new Promise(resolve => {
                chrome.storage.local.get(['tiktokConfig'], resolve);
            });

            if (config.tiktokConfig) {
                config.tiktokConfig.stats = {
                    ...config.tiktokConfig.stats,
                    [type + 'Count']: this.stats[type + 'Count'],
                    messageCount: this.stats.messageCount
                };

                chrome.storage.local.set({ tiktokConfig: config.tiktokConfig });
            }
        } catch (error) {
            this.logger.error('更新统计数据失败:', error);
        }

        this.logger.info(`📊 统计更新: ${type} +1, 总计: ${this.stats[type + 'Count']}`);
    }

    /**
     * 更新配置
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        
        // 更新模拟器配置
        this.simulator.updateConfig({
            safeMode: this.config.system.safeMode
        });

        // 更新日志级别
        if (this.config.system.debugMode) {
            this.logger.setDebug(true);
            this.simulator.setDebug(true);
        } else {
            this.logger.setDebug(false);
            this.simulator.setDebug(false);
        }

        this.logger.info('⚙️ 配置已更新');
    }

    /**
     * 注入页面样式
     */
    injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* TikTok自动化助手页面样式 V2 */
            .tiktok-auto-notification {
                position: fixed !important;
                top: 80px !important;
                right: 20px !important;
                z-index: 99999 !important;
                max-width: 300px !important;
                padding: 12px 16px !important;
                border-radius: 8px !important;
                color: white !important;
                font-size: 14px !important;
                font-weight: 500 !important;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
                animation: slideInFromRight 0.3s ease-out !important;
            }
            
            .tiktok-auto-notification.success {
                background: linear-gradient(45deg, #10b981, #059669) !important;
            }
            
            .tiktok-auto-notification.error {
                background: linear-gradient(45deg, #ef4444, #dc2626) !important;
            }
            
            .tiktok-auto-notification.info {
                background: linear-gradient(45deg, #3b82f6, #2563eb) !important;
            }
            
            @keyframes slideInFromRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            .tiktok-auto-processed {
                border: 2px solid #10b981 !important;
                box-shadow: 0 0 10px rgba(16, 185, 129, 0.3) !important;
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * 显示页面通知
     */
    showPageNotification(message, type = 'info') {
        // 移除现有通知
        const existing = document.querySelector('.tiktok-auto-notification');
        if (existing) {
            existing.remove();
        }

        // 创建新通知
        const notification = document.createElement('div');
        notification.className = `tiktok-auto-notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);

        // 3秒后自动移除
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideInFromRight 0.3s ease-out reverse';
                setTimeout(() => notification.remove(), 300);
            }
        }, 3000);
    }

    /**
     * 销毁实例
     */
    destroy() {
        if (this.checkTimer) {
            clearInterval(this.checkTimer);
        }
        
        if (this.pageObserver) {
            this.pageObserver.disconnect();
        }
        
        this.logger.info('🛑 TikTok自动化核心V2已停止');
    }
}

// 等待页面加载完成后启动
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.tiktokAutoCore = new TikTokAutoCore();
    });
} else {
    // 页面已经加载完成
    window.tiktokAutoCore = new TikTokAutoCore();
} 
