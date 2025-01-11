// ==UserScript==
// @name         批量拉黑微博点赞用户 解除拉黑
// @namespace    https://github.com/comdotwww/batchBlockWeiboLikeUser
// @version      1.0
// @description  批量拉黑微博点赞用户 解除拉黑
// @author       comdotwww
// @match        *://service.account.weibo.com/reportspam*
// @grant        GM_xmlhttpRequest
// @run-at       document-end
// @license           GPL-3.0
// @updateURL         https://cdn.jsdelivr.net/gh/comdotwww/batchBlockWeiboLikeUser@latest/batchBlockWeiboLikeUser.user.js
// @downloadURL       https://cdn.jsdelivr.net/gh/comdotwww/batchBlockWeiboLikeUser@latest/batchBlockWeiboLikeUser.user.js
// @homepageURL       https://github.com/comdotwww/batchBlockWeiboLikeUser
// @supportURL        https://github.com/comdotwww/batchBlockWeiboLikeUser/issues
// ==/UserScript==

(function() {
    'use strict';

    // 等待页面加载完成
    window.addEventListener('load', function() {
        // 获取report元素
        const reportElement = document.querySelector('a.mod-btn');
        if (!reportElement) {
            console.log('未找到report元素');
            return;
        }

        /**
         * 休眠指定毫秒
         *
         * @param {Number} time
         * @returns
         */
        function sleep(time) {
            return new Promise((resolve) => setTimeout(resolve, time));
        }


        /**
         * 获取点赞用户 uid 分页列表
         *
         * @param {string} actionData
         * @param {string} page
         * @returns
         */
        async function getLikePage(actionData, page = 1) {
            let uidArray = [0, []]
            return new Promise(function(resolve, reject) {
                let rnd = Math.floor(Math.random() * 1e4 + 1.5788995e12);
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: `https://weibo.com/aj/like/object/big?ajwvr=6&object_type=comment&page=${page}&object_id=${actionData}&__rnd=${rnd}`,
                    headers: {
                        'Content-Type': 'application/json;charset=UTF-8',
                        'referer': 'https://weibo.com/',
                    },
                    onload(res) {
                        if (res.status === 200) {
                            const json = JSON.parse(res.responseText);
                            uidArray = [json.data.page.totalpage, Array.from(json.data.html.matchAll(/uid=['"](.+?)['"]/ig))
                                .map(x => x[1])
                            ]
                        } else {
                            alert(res.statusText);
                        }
                        resolve(uidArray);
                    },
                    onerror: function(error) {
                        console.error('请求失败:', error);
                        alert('请求失败，请检查控制台');
                    },
                });
            });

        }

        /**
         * 循环获取所有点赞用户 uid 集合
         *
         * @param {string} actionData
         * @returns
         */
        async function getLikeData(actionData) {
            const uids = []
            const uuu = await getLikePage(actionData)
            const page = uuu[0] || 0
            const uid = uuu[1] || []
            uids.push(...uid);
            if (page > 1) {
                // 休眠
                await sleep(Math.floor(Math.floor((Math.random() * 1000) + 1000)));
                const pages = new Array(page - 1).fill(0).map((x, i) => i + 2)
                const datas = await Promise.all(pages.map(x => getLikePage(actionData, x)))
                datas.forEach(x => {
                    uids.push(...x[1])
                })
            }
            return uids
        }

        /**
         * 根据用户的 uid 拉黑指定用户
         *
         * @param {string} uid
         * @returns
         */
        async function blockUser(uid) {
            let rnd = Math.floor(Math.random() * 1e4 + 1.5788995e12);
            return new Promise(function(resolve, reject) {
                GM_xmlhttpRequest({
                    method: 'POST',
                    url: 'https://weibo.com/aj/filter/block?ajwvr=6',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'referer': 'https://weibo.com/',
                    },
                    data: `uid=${uid}&filter_type=1&status=1&interact=1&follow=1&__rnd=${rnd}`,
                    onload(res) {
                        resolve(JSON.parse(res.responseText));
                    }
                });
            });
        }


        /**
         * 根据用户的 uid 解除拉黑指定用户
         *
         * @param {string} uid
         * @returns
         */
        async function unblockUser(uid) {
            let rnd = Math.floor(Math.random() * 1e4 + 1.5788995e12);
            return new Promise(function(resolve, reject) {
                GM_xmlhttpRequest({
                    method: 'POST',
                    url: 'https://weibo.com/aj/f/delblack?ajwvr=6',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'referer': 'https://weibo.com/',
                    },
                    data: `uid=${uid}&objectid=&f=1&__rnd=${rnd}`,
                    onload(res) {
                        resolve(JSON.parse(res.responseText));
                    }
                });
            });
        }

        /**
         * 拉黑所有点赞用户 uid 集合
         *
         * @param {Array} actionData
         */
        async function blockAll(actionData) {
            const link = this
            link.onclick = undefined

            this.innerText = `正在获取点赞用户...`
            const uids = await getLikeData(actionData)
            let failed = [...uids]

            const blockUsers = async function(evt) {
                const refailed = []
                link.innerText = `已拉黑 0/${failed.length}`

                for (var i = 0; i < failed.length; i++) {
                    // 休眠
                    if (i % 5 == 0) {
                        await sleep(Math.floor(Math.floor((Math.random() * 1000) + 1000)));
                    }
                    const data = await blockUser(failed[i])
                    if (data.code != '100000') refailed.push(failed[i])

                    link.innerText = `已拉黑 ${i + 1}/${failed.length}: ${data.msg}`
                }

                if (refailed.length > 0) {
                    link.innerText = `再次尝试拉黑剩余${refailed.length}人`
                    link.onclick = blockUsers

                } else {
                    link.onclick = undefined
                    link.innerText = uids.length + '人已全部拉黑'
                    link.style.color = '#CCC'
                }

                failed = refailed
                evt && evt.stopPropagation()
            }
            await blockUsers()

        }

        /**
         * 取消拉黑所有点赞用户 uid 集合
         *
         * @param {Array} actionData
         */
        async function unblockAll(actionData) {
            const link = this
            link.onclick = undefined

            this.innerText = `正在获取点赞用户...`
            const uids = await getLikeData(actionData)
            let failed = [...uids]

            const blockUsers = async function(evt) {
                const refailed = []
                link.innerText = `已取消拉黑 0/${failed.length}`

                for (var i = 0; i < failed.length; i++) {
                    // 休眠
                    if (i % 5 == 0) {
                        await sleep(Math.floor(Math.floor((Math.random() * 1000) + 1000)));
                    }
                    const data = await unblockUser(failed[i])
                    if (data.code != '100000') refailed.push(failed[i])

                    link.innerText = `已取消拉黑 ${i + 1}/${failed.length}: ${data.msg}`
                }

                if (refailed.length > 0) {
                    link.innerText = `再次尝试取消拉黑剩余${refailed.length}人`
                    link.onclick = blockUsers

                } else {
                    link.onclick = undefined
                    link.innerText = uids.length + '人已全部取消拉黑'
                    link.style.color = '#CCC'
                }

                failed = refailed
                evt && evt.stopPropagation()
            }
            await blockUsers()

        }

        // 创建“拉黑评论用户”按钮
        const blockCommentUserButton = document.createElement('button');
        blockCommentUserButton.textContent = '拉黑该用户';
        blockCommentUserButton.style.marginLeft = '10px';
        blockCommentUserButton.style.padding = '5px 10px';
        blockCommentUserButton.style.backgroundColor = '#ff4d4f';
        blockCommentUserButton.style.color = '#fff';
        blockCommentUserButton.style.border = 'none';
        blockCommentUserButton.style.borderRadius = '4px';
        blockCommentUserButton.style.cursor = 'pointer';

        // 创建“拉黑点赞用户”按钮
        const blockLikeUserButton = document.createElement('button');
        blockLikeUserButton.textContent = '拉黑点赞用户';
        blockLikeUserButton.style.marginLeft = '10px';
        blockLikeUserButton.style.padding = '5px 10px';
        blockLikeUserButton.style.backgroundColor = '#ff4d4f';
        blockLikeUserButton.style.color = '#fff';
        blockLikeUserButton.style.border = 'none';
        blockLikeUserButton.style.borderRadius = '4px';
        blockLikeUserButton.style.cursor = 'pointer';

        // 创建“解除拉黑点赞用户”按钮
        const unblockLikeUserButton = document.createElement('button');
        unblockLikeUserButton.textContent = '解除拉黑点赞用户';
        unblockLikeUserButton.style.marginLeft = '10px';
        unblockLikeUserButton.style.padding = '5px 10px';
        unblockLikeUserButton.style.backgroundColor = '#228B22';
        unblockLikeUserButton.style.color = '#fff';
        unblockLikeUserButton.style.border = 'none';
        unblockLikeUserButton.style.borderRadius = '4px';
        unblockLikeUserButton.style.cursor = 'pointer';

        // 将按钮插入到report元素后面
        reportElement.parentNode.insertBefore(blockCommentUserButton, reportElement.nextSibling);
        reportElement.parentNode.insertBefore(blockLikeUserButton, blockCommentUserButton.nextSibling);
        reportElement.parentNode.insertBefore(unblockLikeUserButton, blockLikeUserButton.nextSibling);

        // 获取hid元素
        const hidElement = document.getElementById('extra_data');
        if (!hidElement) {
            console.log('未找到extra_data元素');
            return;
        }

        // 解析hid元素中的value参数
        const params = new URLSearchParams(hidElement.value);

        // 为“拉黑评论用户”按钮添加点击事件
        blockCommentUserButton.onclick = async function() {
            const rUid = params.get('r_uid');
            if (rUid) {
                alert(`拉黑评论用户：uid = ${rUid}`);
                // 在这里添加拉黑评论用户的逻辑
                const data = await blockUser(rUid)
                if (data.code != '100000') {
                    alert('拉黑失败，请重试。');
                } else {
                    this.onclick = undefined
                    this.innerText = '已拉黑'
                    this.style.color = '#CCC'
                }
            } else {
                alert('未找到用户id参数');
            }
        };

        // 为“拉黑点赞用户”按钮添加点击事件
        blockLikeUserButton.onclick = blockAll.bind(blockLikeUserButton, params.get('rid'));
        // 为“取消拉黑点赞用户”按钮添加点击事件
        unblockLikeUserButton.onclick = unblockAll.bind(unblockLikeUserButton, params.get('rid'));
    });
})();
