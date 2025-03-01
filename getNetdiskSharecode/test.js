// ==UserScript==
// @name         中国大学慕课mooc答题/自动播放脚本(domooc)
// @namespace    https://lolzyx.xyz/
// @version      1.7.2
// @description  自动完成你的mooc考试测验客观题，开始刷课后自动看视频、看课件、自动讨论。使用过程中会上传您的mooc账户信息（包括昵称、ID、邮箱等）以识别用户。觉得好用请点击捐赠作者按钮捐赠我。
// @author       Democrazy
// @match        https://www.icourse163.org/learn/*
// @match        http://www.icourse163.org/learn/*
// @match        http://www.icourse163.org/spoc/learn/*
// @match        https://www.icourse163.org/spoc/learn/*
// @connect      lolzyx.xyz
// @connect      localhost
// @grant        unsafewindow
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @require      http://cdn.staticfile.org/jquery/3.4.1/jquery.min.js
// @run-at       document-start
// ==/UserScript==
(function () {
    let window = unsafeWindow;
    let usersetting = {
        cdkey: "",          //捐赠后获取的cdkey
        timeout: 800,       //答题延时，每两道题之间的时间间隔
        autogetanswer: false,//是否开启自动获取答案，开启后每次进入测验都将向服务器请求数据，并扣除相应的积分
        autoanswer: true,   //是否开启自动答题，如果设置为false，正确答案会被标记为绿色，或在填空题旁边显示答案
        learnCourse: {     //刷课时的配置
            video: true,    //是否刷视频
            doc: true,      //是否刷文档
            test: true,     //是否刷随堂测验（不消耗答题次数）
            discuss: true,  //是否刷讨论（将自动从当前页面选一条最长的评论复制粘贴，如果当前讨论还没有人发表评论则跳过）
            playrate: 0,    //视频倍速，0表示不改变播放器的倍速
        }
    };

    String.prototype.trim2 = function () { return this.trim().replace(/\s+/g, " "); };
    String.prototype.trim1 = function () { return this.trim().replace(/\s+/g, ""); };
    String.prototype.domoocformat = function (isnew) {
        if (isnew) {
            let imgreg = /<\s*img[^>]+src\s*=\s*(["'])(.*?)\1[^>]*>/;
            let s = this.replace(imgreg, 'dm|$2:|md');
            if (typeof $ === "function") {
                return $(s).text().trim2();
            } else {
                let $p = cheerio.load(`<div id="domooc">${s}</div>`);
                return $p.text().trim2();
            }
        } else {
            let htmlDecode = function (str) {
                let s = "";
                if (str.length == 0) return "";
                s = str.replace(/&lt;/g, "<");
                s = s.replace(/&gt;/g, ">");
                s = s.replace(/&nbsp;/g, " ");
                s = s.replace(/&#39;/g, "\'");
                s = s.replace(/&quot;/g, "\"");
                s = s.replace(/&amp;/g, "&");
                return s;
            }
            let regx = /<[img ]{3,}[\S]+?[https]{3,4}:\/\/([\S]+?\.[pngjeifbm]{3,4})[\S]+?>/gi;
            let regx2 = /\<[\S ]+?\>/ig;
            return htmlDecode(this).trim1().replace(regx, "$1").replace(regx2, "");
        }
    }
    if (window.scriptloaded) {
        return;
    }
    function init(window, $, usersetting, GM_getValue, GM_setValue, GM_xmlhttpRequest) {
        let scriptdata = {
            version: "172",
            qqgroup: null,
            baseurl: 'https://lolzyx.xyz/api/',
            // baseurl: 'https://localhost/api/',
            debug: false,
        };
        let document = window.document;
        let JSON = window.JSON;
        let version = scriptdata.version;
        let qqgroup = scriptdata.qqgroup;
        let baseurl = scriptdata.baseurl;
        let debug = scriptdata.debug;
        let tnames = {};
        let handledomoocRPC = "handledomoocRPC";
        let getAnswer = 'getAnswer';
        let analysisAnswer = 'analysisAnswer';
        let answerClassTest = 'answerClassTest';
        let learnCourse = 'learnCourse';
        let setPage = 'setPage';
        let setUnitId = 'setUnitId';
        let _view = 'view';
        let showQuizbank = 'showQuizbank';
        let _uploadedExams = 'uploadedExams';
        let bindGetAnswer = "bindGetAnswer";
        let domooc = {
            get donateurl() {
                return `https://lolzyx.xyz/donate?id=${webUser.id}`
            },
            get csrf() {
                let name = 'NTESSTUDYSI';
                let arr, reg = new RegExp("(^| )" + name + "=([^;]*)(;|$)");
                if (arr = document.cookie.match(reg))
                    return unescape(arr[2]);
                else
                    return null;
            },
            $, $,
            url: {
                getAnswerById: baseurl + 'getAnswerById',
                getanswer: baseurl + 'getanswer',
                check: baseurl + 'checkcourse',
                userMessage: baseurl + 'userMessage',
                upsertQuizpaper: baseurl + 'upsertquizpaper',
                fastGetCourse: baseurl + 'fastGetCourse',
                getQuizInfo: "https://www.icourse163.org/dwr/call/plaincall/MocQuizBean.getQuizInfo.dwr",
                getLastLearnedMocTermDto: "https://www.icourse163.org/dwr/call/plaincall/CourseBean.getLastLearnedMocTermDto.dwr",
                getQuizPaper: "https://www.icourse163.org/dwr/call/plaincall/MocQuizBean.getQuizPaperDto.dwr"
            },
            console: {
                log: (msg) => { if (!!debug) window.console.log(msg) },
                error: (msg) => { if (!!debug) window.console.error(msg) },
            },
            utils: {
                getBatchID: function () {
                    let batchId = new Date().getTime();
                    return batchId - 500 - (Math.random() * 500 | 0);
                }

            }
        };
        $(() => {
            let utils = domooc.utils;
            utils.processReturnResult = function (res) {
                if (res.qqgroup) {
                    qqgroup = res.qqgroup;
                    view.addInfo("交流群：" + qqgroup);
                }
                if (res.message) {
                    view.addInfo(res.message);
                }
                if (res.button) {
                    viewbuttons.push(res.button);
                    view.refreshBtnList();
                }
                if (res.msgobj) {
                    view.showServerMsg(res.msgobj);
                }
                if (res.user) {
                    domooc.userinfo = res.user;
                    let leftcredits = res.user.credits - res.user.usedcredits;
                    if (res.user.cdkey) {
                        if (!GM_getValue('cdkey') || GM_getValue('cdkey') === "undefined") {
                            GM_setValue('cdkey', res.user.cdkey.pattern);
                        }
                        leftcredits = res.user.cdkey.credits - res.user.cdkey.usedcredits;
                        view.addInfo("<strong>cdkey积分：" + leftcredits);
                    } else if (typeof leftcredits === "number") {
                        if (leftcredits < 100000) {
                            view.addInfo("<strong>账号积分：" + leftcredits);
                        }
                    }
                }
            }
            window[handledomoocRPC] = (batchId, status, obj) => {
                if (obj && obj.mocTermDto && obj.mocTermDto.exams && obj.mocTermDto.exams.length) {
                    let exams = obj.mocTermDto.exams;
                    for (let i = 0; i < exams.length; i++) {
                        window.setTimeout(() => {
                            if (exams[i].objectTestId) {
                                if (utils.shouldUpload(exams[i].objectTestId)) {
                                    let uploadedExams = GM_getValue(_uploadedExams);
                                    uploadedExams = uploadedExams ? uploadedExams : [];
                                    if (uploadedExams.indexOf(exams[i].objectTestId) < 0) {
                                        tnames[exams[i].objectTestId] = exams[i].name;
                                        domooc.utils.getExamInfo(exams[i].objectTestId);
                                    }
                                }
                            }
                        }, i * 1000 * 5);
                    }
                    domooc.console.log('first stage finised');
                } else if (obj && obj.targetAnswerform && obj.targetAnswerform.aid) {
                    window.setTimeout(() => {
                        domooc.utils.getQuizPaper(obj.tid, obj.targetAnswerform.aid);
                    }, 2000);
                    domooc.console.log('second stage finised');
                } else {
                    if (obj && obj.objectiveQList && obj.objectiveQList.length) {
                        obj.isExam = true;
                        obj.tname = tnames[obj.tid];
                        domooc.analysisAnswer(obj);
                    }
                    domooc.console.log(obj);
                }
            };
            utils.shouldUpload = (id) => {
                let shouldUpload = true;
                if (domooc.quizbank instanceof Array) {
                    domooc.quizbank.forEach(quiz => {
                        if (quiz.id === id && !quiz.get) {
                            shouldUpload = false;
                        }
                    });
                }
                return shouldUpload;
            }
            utils.getLastLearnedMocTermDto = function (coursedto) {
                if (!coursedto) {
                    coursedto = window.courseCardDto;
                }

                let requestPayload = "callCount=1\n" + "scriptSessionId=${scriptSessionId}190\n" +
                    "httpSessionId=" + domooc.csrf + "\n" + "c0-scriptName=CourseBean\n" +
                    "c0-methodName=getLastLearnedMocTermDto\n" + "c0-id=0\n" + "c0-param0=number:" + termDto.id + "\n" +
                    "batchId=" + this.getBatchID();
                let res = null;
                $.ajax({
                    url: domooc.url.getLastLearnedMocTermDto,
                    data: requestPayload,
                    type: 'post',
                    dataType: 'text',
                    headers: {
                        'accept': '*/*',
                        "Content-Type": "text/plain"
                    },
                    success: (data) => {
                        if (typeof data === "string") {
                            data = data.replace(/dwr\.engine\._[\w]+\(/, 'handledomoocRPC(');
                            window.eval(data);
                        }
                    }
                });
                return res;
            };
            utils.getExamInfo = async function (objectTestId, aid) {
                let requestPayload = `callCount=1\nscriptSessionId=\${scriptSessionId}190\nhttpSessionId=${domooc.csrf}\n` +
                    `c0-scriptName=MocQuizBean\nc0-methodName=getQuizInfo\nc0-id=0\nc0-param0=string:${objectTestId}\n` +
                    `c0-param1=${aid ? ("string:" + aid) : "null:null"}\nc0-param2=boolean:false\nbatchId=${this.getBatchID()}`;
                $.ajax({
                    url: domooc.url.getQuizInfo,
                    data: requestPayload,
                    type: 'post',
                    dataType: 'text',
                    headers: {
                        'accept': '*/*',
                        "Content-Type": "text/plain"
                    },
                    success: (data) => {
                        if (typeof data === "string") {
                            data = data.replace(/dwr\.engine\._[\w]+\(/, 'handledomoocRPC(');
                            window.eval(data);
                        }
                    }
                });
            };
            utils.getQuizPaper = async function (quizid, aid) {
                if (aid === undefined) {
                    aid = 0;
                }
                let requestPayload = "callCount=1\n" +
                    "scriptSessionId=${scriptSessionId}190\n" +
                    "httpSessionId=" + domooc.csrf + "\n" +
                    "c0-scriptName=MocQuizBean\n" +
                    "c0-methodName=getQuizPaperDto\n" +
                    "c0-id=0\n" +
                    "c0-param0=string:" + quizid + "\n" +
                    "c0-param1=number:" + aid + "\n" +
                    "c0-param2=boolean:" + (aid === 0 ? "false" : "true") + "\n" +
                    "batchId=" + this.getBatchID();
                $.ajax({
                    url: domooc.url.getQuizPaper,
                    data: requestPayload,
                    type: 'post',
                    dataType: 'text',
                    headers: {
                        'accept': '*/*',
                        "Content-Type": "text/plain"
                    },
                    success: (data) => {
                        if (typeof data === "string") {
                            data = data.replace(/dwr\.engine\._[\w]+\(/, handledomoocRPC + '(');
                            window.eval(data);
                        }
                    }
                });
            };
            utils.remove = function (arr, val) {
                var index = arr.indexOf(val);
                while (index > -1) {
                    arr.splice(index, 1);
                    index = arr.indexOf(val);
                }
                return arr;
            };
            utils.unique = function (arr, compareFn) {
                arr.sort(compareFn);
                var re = [arr[0]];
                for (var i = 1; i < arr.length; i++) {
                    if (compareFn(arr[i], re[re.length - 1]) !== 0) {
                        re.push(arr[i]);
                    }
                }
                return domooc.utils.remove(re, undefined);
            };
            function initParams() {
                domooc.quizs = null;
                domooc.exceptionflag = false;
                domooc.quizpaper = {};
                domooc.qb = {};
                domooc.quiztests = [];
                domooc.termid = 0;
                domooc.courseid = 0;
                domooc.answerAll = false;
                domooc.getAnswerflag = false;
            }
            domooc.getAnswerquizs = [];
            let getAnswerByIdflag = false;
            domooc.getAnswerById = function (ele, quiz) {
                if (getAnswerByIdflag || domooc.getAnswerquizs.indexOf(quiz.id) > -1) {
                    return;
                }
                let data = getInitialData();
                data.quiz = quiz;
                getAnswerByIdflag = true;
                GM_xmlhttpRequest({
                    method: 'POST',
                    url: domooc.url.getAnswerById,
                    data: JSON.stringify(data),
                    headers: {
                        'charset': 'UTF-8',
                        "Content-Type": "text/plain"
                    },
                    onerror: (error) => {
                        getAnswerByIdflag = false;
                        view.addInfo("获取答案失败！", "网络或服务器错误");
                    },
                    ontimeout: (error) => {
                        getAnswerByIdflag = false;
                        view.addInfo("获取答案失败！", "网络超时");
                    },
                    onload: response => {
                        domooc.getAnswerquizs.push(quiz.id);
                        getAnswerByIdflag = false;
                        let res = JSON.parse(response.responseText);
                        domooc.utils.processReturnResult(res);
                        if (response.status == 200) {
                            res.answer.answer = res.answer.answer.replace(/dm\|([\S]+?):\|md/g, '<img src="$1"/>');
                            let displaymsg = res.success ? ('参考答案：' + res.answer.answer) : ('此题无答案！');
                            $(ele).parent().append(displaymsg);
                            $(ele).remove();
                        } else {
                            view.addInfo("获取答案失败！", res.detail);
                            domooc.console.log({
                                err: response
                            });
                        }
                    }
                });
            }
            function userMessage(msg) {
                if (!msg) {
                    return;
                }
                view.addInfo("正在留言...");
                let data = getInitialData();
                data.message = msg;
                GM_xmlhttpRequest({
                    method: 'POST',
                    url: domooc.url.userMessage,
                    data: JSON.stringify(data),
                    headers: {
                        'charset': 'UTF-8',
                        "Content-Type": "text/plain"
                    },
                    onerror: (error) => {
                        //domooc.console.log({ onerror: error });
                        view.addInfo("留言失败！", "网络或服务器错误");
                    },
                    ontimeout: (error) => {
                        //domooc.console.log({ ontimeout: error });
                        view.addInfo("留言失败！", "网络超时");
                    },
                    onload: response => {
                        if (response.status == 200) {
                            let res = JSON.parse(response.responseText);
                            domooc.console.log(res);
                            if (res.error) {
                                view.addInfo("留言失败！", res.detail);
                            } else {
                                view.addInfo("留言成功！");
                            }
                        } else {
                            domooc.getAnswerflag = false;
                            view.addInfo("留言失败！");
                            domooc.console.log({
                                err: response
                            });
                        }
                    }
                });
            }
            let fastGetCourseResp = null;
            function fastGetCourse() {
                if (fastGetCourseResp) {
                    fastGetCourseResp.showMsg();
                    return;
                }
                if (domooc.notsupport) {
                    let msg = "当前课程暂不支持获取答案，建议和同学合作" +
                        "<br>您可以利用自动上传功能获取题库，在没有题库的情况下先随便做一遍，脚本将自动上传正确答案到服务器，反复几次获取完测验的答案后即可实现100%准确率" +
                        "<br>比如有的测验只有10道题，但是它的题库有20道，这样你第一次获取了10道题，但是还有10道题是没有答案的，所以多叫几个同学，每个人答一次，就能把完全取得这20题的答案" +
                        "<br>对于考试，您可以先用小号随便做，提交之后刷新并在测验页面等待几十秒，脚本将自动上传考试答案，即使还未公布成绩";
                    view.showServerMsg(msg);
                    return;
                }
                view.addInfo("正在加入刷题队列...");
                let data = getInitialData();
                GM_xmlhttpRequest({
                    method: 'POST',
                    url: domooc.url.fastGetCourse,
                    data: JSON.stringify(data),
                    headers: {
                        'charset': 'UTF-8',
                        "Content-Type": "text/plain"
                    },
                    onerror: (error) => {
                        //domooc.console.log({ onerror: error });
                        view.addInfo("加入刷题队列失败", "网络或服务器错误");
                    },
                    ontimeout: (error) => {
                        //domooc.console.log({ ontimeout: error });
                        view.addInfo("加入刷题队列失败", "网络超时");
                    },
                    onload: response => {
                        let res = JSON.parse(response.responseText);
                        if (response.status == 200) {
                            domooc.console.log(res);
                            if (res.error) {
                                view.addInfo("加入刷题队列失败", res.detail);
                            } else {
                                fastGetCourseResp = res;
                                view.addInfo("加入刷题队列成功");
                                let currentTime = new Date().getTime();
                                fastGetCourseResp.showMsg = function () {
                                    let remain = this.time - ((new Date().getTime() - currentTime) / 1000 | 0);
                                    let msg = "";
                                    if (remain > 0) {
                                        msg = `您请求的课程排在队列第${this.idx + 1}位，预计${remain}秒左右可以获取答案`;
                                    } else {
                                        msg = "您请求的题库预计已完成获取（高峰期可能会延迟几分钟），请到<公告>页面刷新后重新进行答题。";
                                    }
                                    msg = msg + "<br><br>注意：作业简答题等主观题暂时没有题库，请不要滥用此功能！";
                                    view.showServerMsg(msg);
                                }
                                fastGetCourseResp.showMsg();
                                domooc.fastcoursehandler = window.setInterval(() => {
                                    courseCheck();
                                    if ((new Date().getTime() - currentTime) < -1000 * 30) {
                                        window.clearInterval(domooc.fastcoursehandler);
                                    }
                                }, 15 * 1000);
                            }
                        } else {
                            domooc.getAnswerflag = false;
                            view.addInfo("加入刷题队列失败", res.detail);
                            domooc.console.log({
                                err: response
                            });
                        }
                    }
                });
            }


            // learnCourse.start();

            domooc.answerClassTest = function (paper) {
                let quizs = paper.objectiveQList;
                let answers = [];
                if (domooc.quizbank instanceof Array) {
                    let ids = domooc.quizbank.map(x => x.id);
                    if (ids.indexOf(paper.tid) < 0) {
                        let data = getInitialData();
                        data.quizpaper = paper;
                        data.type = "classtest";
                        GM_xmlhttpRequest({
                            method: 'POST',
                            url: domooc.url.upsertQuizpaper,
                            data: JSON.stringify(data),
                            headers: {
                                'charset': 'UTF-8',
                                "Content-Type": "text/plain"
                            }
                        });
                    }
                }
                quizs.forEach((ele, idx) => {
                    let obj = {
                        id: ele.id,
                        type: ele.type,
                        answer: []
                    };
                    if ([1, 2, 4].indexOf(ele.type) > -1) {
                        ele.optionDtos.forEach((ele2, idx2) => {
                            if (ele2.answer) {
                                obj.answer.push(idx2);
                            }
                        });
                    } else {
                        let correct = ele.stdAnswer.split(domooc.FILL_BLANK_SPLITCHAR);
                        correctOpt = null;
                        let len = correct.length;
                        for (let i = 0; i < len; i++) {
                            let ele2 = correct[i];
                            if (ele2.indexOf(' ') === -1) {
                                correctOpt = ele2;
                                break;
                            }
                        }
                        correctOpt = correctOpt ? correctOpt : correct[len - 1];
                        obj.answer = correctOpt;
                    }
                    answers.push(obj);
                });
                answerAll(answers, true);
            }
            let answerAction = {
                click: function (input, correct) {
                    if (usersetting.autoanswer) {
                        $(input).click();
                    } else {
                        $(input).parent().css('background-color', correct ? '#a4e2c6' : '#ffb3a7');
                    }
                },
                check: function (input, correct) {
                    if (usersetting.autoanswer) {
                        if (($(input).is(':checked') && !correct) || (!$(input).is(':checked') && correct)) {
                            $(input).click();
                        }
                    } else {
                        $(input).parent().css('background-color', correct ? '#a4e2c6' : '#ffb3a7');
                    }
                },
                blank: function (label, textarea, answer) {
                    let answerflag = false;
                    if (usersetting.autoanswer) {
                        label.click();
                        textarea.click();
                        textarea.focus();
                        if (answer && (typeof answer === "string")) {
                            textarea.value = answer;
                            answerflag = true;
                        }
                    } else {
                        if (answer && (typeof answer === "string")) {
                            $(textarea).parent().append($(`<p>正确答案：${answer}</p>`));
                            answerflag = true;
                        }
                    }
                    return answerflag;
                }
            };
            function answerAll(quizanswers) {
                try {
                    let answers = quizanswers;
                    domooc.noAnswer = false;
                    let cnt = 0;
                    let length = $('div.m-data-lists.f-cb.f-pr.j-data-list').children().length;
                    let noAnswerIdx = [];
                    if (document.location.href.indexOf('hw') > -1) {
                        $("div.j-homework-paper  div.j-title.f-cb.title.questionDes > div.qaDescription.f-fl.f-cb div.f-richEditorText.j-richTxt.f-fl").each((idx, ele) => {
                            answers[idx].answer = answers[idx].answer.replace(/dm\|([\S]+?):\|md/g, '<img src="$1"/>');
                            $(ele).append($(`<p style="color:#16a951">评分标准：${answers[idx].answer}</p>`));
                        });
                    } else {
                        $('div.m-data-lists.f-cb.f-pr.j-data-list').children().each((idx, ele) => {
                            cnt++;
                            window.setTimeout(() => {
                                let answerflag = false;
                                if ([1, 2, 4].indexOf(answers[idx].type) > -1) {
                                    $(ele).find('input').each((idx2, input) => {
                                        let tempfunc = answers[idx].type === 2 ? answerAction.check : answerAction.click;
                                        if (answers[idx].answer.indexOf(idx2) > -1) {
                                            answerflag = true;
                                            tempfunc(input, true);
                                        } else if (!usersetting.autoanswer) {
                                            tempfunc(input, false);
                                        }
                                    });
                                } else if (answers[idx].type === 3) {
                                    let textarea = $(ele).find("textarea.j-textarea.inputtxt")[0];
                                    let label = $(ele).find("label.j-hint")[0];
                                    if (answerAction.blank(label, textarea, answers[idx].answer)) {
                                        answerflag = true;
                                    }
                                }
                                if (!answerflag) {
                                    domooc.noAnswer = true;
                                    noAnswerIdx.push(idx + 1);
                                    $(ele).css("background-color", "rgb(254, 255, 209)");
                                }
                                if (idx === length - 1) {
                                    if (domooc.noAnswer) {
                                        view.showServerMsg(`第${noAnswerIdx.join(', ')}题无答案！`);
                                    }
                                    domooc.answerAll = true;
                                }
                            }, ((usersetting.timeout < 200 ? 200 : usersetting.timeout) * cnt + Math.random() * 500));
                        });
                    }
                    view.addInfo("自动答题成功！");
                    if (qqgroup) {
                        view.addInfo("交流群：" + qqgroup);
                    }
                } catch (error) {
                    view.addInfo("自动答题失败！");
                    if (qqgroup) {
                        view.addInfo("交流群：" + qqgroup);
                    }
                }
            }
            let upsertQuizpaperflag = false;

            domooc.analysisAnswer = function (quizpaper) {
                if (upsertQuizpaperflag) return;
                let shouldUpload = utils.shouldUpload(quizpaper.tid);
                if (quizpaper.isExam) {
                    shouldUpload = true;
                }
                let answers = quizpaper.answers;
                let qlist = quizpaper.objectiveQList;
                let answs = {};
                let allright = true;
                if (!(answers instanceof Array)) {
                    allright = false
                } else if (answers.length < qlist.length) {
                    allright = false
                } else {
                    answers.forEach(ele => {
                        if ([1, 2, 4].indexOf(ele.type) > -1) {
                            answs[ele.qid] = {
                                optIds: (ele.optIds instanceof Array) ? ele.optIds : []
                            }
                        } else {
                            answs[ele.qid] = {
                                content: ele.content.content
                            }
                        }
                    });
                    qlist.forEach((ele) => {
                        if ([1, 2, 4].indexOf(ele.type) > -1) {
                            ele.optionDtos.forEach(opt => {
                                if ((opt.answer && answs[ele.id].optIds.indexOf(opt.id) < 0) || (!opt.answer && answs[ele.id].optIds.indexOf(opt.id) > -1)) {
                                    allright = false;
                                }
                            });
                        } else {
                            if (ele.stdAnswer.split(domooc.FILL_BLANK_SPLITCHAR).indexOf(answs[ele.id] ? answs[ele.id].content : "") < 0) {
                                allright = false;
                            }
                        }
                    });
                }
                if (!allright || domooc.noAnswer || shouldUpload) {
                    let data = getInitialData();
                    data.quizpaper = quizpaper;
                    data.type = "quizbank";
                    if (quizpaper.isExam) {
                        data.type = "exam";
                    }
                    domooc.console.log({ getAnswer: data });
                    if (!shouldUpload) {
                        view.addInfo("检测到题库错误，正在上传...");
                    }
                    upsertQuizpaperflag = true;
                    GM_xmlhttpRequest({
                        method: 'POST',
                        url: domooc.url.upsertQuizpaper,
                        data: JSON.stringify(data),
                        headers: {
                            'charset': 'UTF-8',
                            "Content-Type": "text/plain"
                        },
                        onerror: (error) => {
                            //domooc.console.log({ onerror: error });
                            upsertQuizpaperflag = false;
                            if (!shouldUpload) {
                                view.addInfo("结果分析失败！", "如答案有错请加交流群");
                            }
                        },
                        ontimeout: (error) => {
                            //domooc.console.log({ ontimeout: error });
                            upsertQuizpaperflag = false;
                            if (!shouldUpload) {
                                view.addInfo("结果分析失败！", "如答案有错请加交流群");
                            }
                        },
                        onload: response => {
                            if (response.status == 200) {
                                upsertQuizpaperflag = false;
                                let res = JSON.parse(response.responseText);
                                domooc.utils.processReturnResult(res);
                                // view.addInfo("答案上传成功！");
                                // if (res.newCnt) {
                                // view.addInfo(`本次上传：${res.newCnt} 累计上传：${res.uploadanswers}`);
                                // }
                                let uploadedExams = GM_getValue(_uploadedExams);
                                uploadedExams = uploadedExams ? uploadedExams : [];
                                uploadedExams.push(quizpaper.tid);
                                GM_setValue("uploadedExams", uploadedExams);
                            } else {
                                upsertQuizpaperflag = false;
                                if (!shouldUpload) {
                                    view.addInfo("结果分析失败！", "如答案有错请加交流群");
                                }
                                domooc.console.log({
                                    err: response
                                });
                            }
                        }
                    });
                    upsertQuizpaperflag = true;
                }
                domooc.console.log({
                    analysisAnswer: quizpaper
                })
            }
            domooc.getAnswer = function (quizpaper) {
                if (domooc.getAnswerflag) {
                    return;
                }
                quizpaper = quizpaper ? quizpaper : domooc.quizpaper;
                if (!quizpaper) {
                    domooc[_view].addInfo("<error>获取答案失败！")
                }
                let data = getInitialData();
                if (data.courseid && data.termid) {
                    data.testid = quizpaper.tid;
                    data.quizs = [];
                    quizpaper.objectiveQList.forEach(t => {
                        let obj = { id: t.id, type: t.type, title: t.title.domoocformat(1) };
                        if (t.type == 1 || t.type == 2 || t.type == 4) {
                            obj.optIds = t.optionDtos.map(x => { return x.id });
                            obj.optContent = t.optionDtos.map(x => { return x.content.domoocformat(1) });
                        }
                        data.quizs.push(obj);
                    });
                    quizpaper.subjectiveQList.forEach(t => {
                        let obj = { id: t.id, type: t.type, title: t.title.domoocformat(1) };
                        data.quizs.push(obj);
                    });
                    view.addInfo("正在获取答案...");
                    domooc.getAnswerflag = true;
                    domooc.console.log({ getAnswer: data })
                    GM_xmlhttpRequest({
                        method: 'POST',
                        url: domooc.url.getanswer,
                        data: JSON.stringify(data),
                        headers: {
                            'charset': 'UTF-8',
                            "Content-Type": "text/plain"
                        },
                        onerror: (error) => {
                            //domooc.console.log({ onerror: error });
                            domooc.getAnswerflag = false;
                            view.addInfo("获取答案失败！", "网络或服务器错误");
                        },
                        ontimeout: (error) => {
                            //domooc.console.log({ ontimeout: error });
                            domooc.getAnswerflag = false;
                            view.addInfo("获取答案失败！", "网络超时");
                        },
                        onload: response => {
                            let res = JSON.parse(response.responseText);
                            domooc.utils.processReturnResult(res);
                            if (response.status == 200) {
                                domooc.console.log(res);
                                if (res.message) {
                                    view.addInfo(res.message);
                                }
                                if (res.button) {
                                    view.buttons.push(res.button);
                                    view.refreshBtnList();
                                }
                                view.showServerMsg(res.msgobj);
                                domooc.quizanswers = res.quizanswers;
                                if (domooc.quizanswers && domooc.quizanswers.length) {
                                    view.addInfo("正在自动进行答题...");
                                    answerAll(res.quizanswers);
                                    $('a.getAnswer').remove();
                                } else {
                                    view.addInfo("测验答案不存在");
                                }
                                domooc.getAnswerflag = false;
                            } else {
                                domooc.getAnswerflag = false;
                                view.addInfo("获取答案失败！", res.detail);
                                domooc.console.log({
                                    err: response
                                });
                            }
                        }
                    });
                } else {
                    domooc.getAnswerflag = false;
                    view.addInfo("获取答案失败！", "请返回上一页重新进入");
                }
            }

            function getInitialData() {
                return {
                    user: {
                        id: window.webUser.id,
                        email: window.webUser.email ? window.webUser.email : "无",
                        nickName: window.webUser.nickName,
                        loginId: window.webUser.loginId,
                        personalUrlSuffix: window.webUser.personalUrlSuffix,
                        loginId: window.webUser.loginId
                    },
                    version: version,
                    termDto: window.termDto,
                    courseDto: window.courseDto,
                    courseCardDto: window.courseCardDto,
                    termid: window.termDto.id,
                    href: domooc.href,
                    courseid: window.courseCardDto.id,
                    cdkey: (GM_getValue('cdkey') && GM_getValue('cdkey') !== "undefined") ? GM_getValue('cdkey') : undefined
                }
            }
            let courseCheckflag = false;
            function courseCheck() {
                if (courseCheckflag) {
                    return;
                }
                let data = getInitialData();
                if (data.courseid && data.termid) {
                    view.addInfo("正在获取题库");
                    courseCheckflag = true;
                    domooc.console.log({
                        courseCheck: data
                    })
                    GM_xmlhttpRequest({
                        method: 'POST',
                        url: domooc.url.check,
                        data: JSON.stringify(data),
                        headers: {
                            'charset': 'UTF-8',
                            "Content-Type": "text/plain"
                        },
                        onerror: () => {
                            courseCheckflag = false;
                            view.addInfo("获取题库失败！");
                        },
                        ontimeout: () => {
                            courseCheckflag = false;
                            view.addInfo("获取题库失败！", "网络超时");
                        },
                        onload: response => {
                            let res = JSON.parse(response.responseText);
                            domooc.notsupport = res.notsupport;
                            domooc.utils.getLastLearnedMocTermDto();
                            domooc.utils.processReturnResult(res);
                            if (response.status == 200) {
                                try {
                                    if (!res.error && res.updatedAt) {
                                        view.addInfo("获取题库成功！",
                                            `最近更新于${new Date(res.updatedAt).toLocaleString()}`,
                                            "下一步请前往测验"
                                        );
                                        domooc.quizbank = res.quizbank;
                                        view.showQuizbank(res.quizbank);
                                    } else {
                                        view.addInfo("获取题库失败！", res.detail);
                                        throw Error()
                                    }
                                } catch (error) {
                                    view.addInfo("获取题库失败！", res.detail);
                                }
                                domooc.console.log(res);
                            } else {
                                view.addInfo("获取题库失败！", res.detail);
                                domooc.console.log({
                                    err: response
                                });
                            }
                        }
                    });
                } else {
                    courseCheckflag = false;
                    view.addInfo("不能获取termId！", null);
                }
            }
            domooc.coursecheck = courseCheck;
            let intHandler = window.setInterval(() => {
                let href = document.location.href;
                if ((href.indexOf('testlist') + href.indexOf('examlist') + href.indexOf('content') + href.indexOf('quizscore') + href.indexOf('quiz') + href.indexOf('hw') > -6) && window.courseCardDto) {
                    domooc.loaded = true;
                    loadxcComfirm($);
                    window.clearInterval(intHandler);
                    initParams();
                    view.init();
                    domooc.edu = window.edu;
                    try {
                        domooc.FILL_BLANK_SPLITCHAR = domooc.edu.u.CONST.FILL_BLANK_SPLITCHAR;
                    } catch (error) {
                        domooc.console.error(error);
                    } finally {
                        domooc.FILL_BLANK_SPLITCHAR = domooc.FILL_BLANK_SPLITCHAR ? domooc.FILL_BLANK_SPLITCHAR : "##%_YZPRLFH_%##";
                    }
                    let handler1 = window.setInterval(() => {
                        let video = document.querySelector("video");
                        if (video && (typeof video.onpause !== "function")) {
                            video.onpause = () => {
                                if ($('div.j-insetCt')[0]) {
                                    $('div.j-insetCt').parent().remove();
                                    video.play();
                                }
                            }
                        }
                    }, 1000);
                    let href = document.location.href;
                    domooc.href = href;
                    if (usersetting.cdkey) {
                        GM_setValue('cdkey', usersetting.cdkey);
                    }
                    let lastUser = GM_getValue('lastUserInfo');
                    if (!lastUser) {
                        lastUser = getInitialData().user;
                        GM_setValue('lastUserInfo', getInitialData().user);
                    }
                    if (lastUser.id !== getInitialData().user.id) {
                        GM_setValue('lastUserInfo', getInitialData().user);
                        view.showServerMsg({
                            title: "MOOC账号更换通知",
                            message: "积分与cdkey绑定，更换账号后可继续使用上一个cdkey的积分<br>如需切换、清空cdkey，请点击右侧设置cdkey按钮<br>切换之前请记得备份当前cdkey，否则无法找回"
                        });
                    }
                    let updatemsg = GM_getValue('updatemsg');
                    if (!updatemsg || parseInt(updatemsg) < 171) {
                        view.showVersion();
                        GM_setValue('updatemsg', version);
                    }
                    courseCheck();
                }
            }, 500);
            let view = {
                config: {
                    tabon: 'u-curtab',
                },
                infoqueue: {
                    arr: [],
                    idx: 0,
                    length: 8,
                    put: function (msg) {
                        this.arr[this.idx % this.length] = msg;
                        this.idx = (this.idx + 1) % this.length;
                    },
                    get: function (num) {
                        return this.arr[(this.idx + num) % this.length];
                    }
                },
                buttons: [{
                    text: "获取积分/设置cdkey/捐赠",
                    style: {
                        "background-color": "rgba(195, 39, 43, 0.3)"
                    },
                    onclick: function () {
                        var txt = "设置cdkey";
                        let currentcdkey = getInitialData().cdkey;
                        let placeholder = currentcdkey ? `正在使用cdkey：${currentcdkey}，如需更换请输入其他cdkey后点击确定按钮，输入“清空”后确定可清除当前cdkey；如需获取cdkey请直接点击确定按钮。` : "无cdkey？点击确定按钮获取！"
                        window.wxc.xcConfirm(txt, window.wxc.xcConfirm.typeEnum.input, {
                            title: "获取积分/设置cdkey/捐赠",
                            onOk: function (v) {
                                if (!v || !v.length) {
                                    window.open(domooc.donateurl);
                                } else {
                                    try {
                                        if (v === "清空") {
                                            var txt = "";
                                            if (currentcdkey && currentcdkey !== "undefined") {
                                                txt = `<span style='color:#16a951;font-size:bold;'>当前cdkey为：${currentcdkey}，清空后不可恢复！</span>`
                                            } else {
                                                txt = `<span style='color:#16a951;font-size:bold;'>本地没有保存cdkey！</span>`
                                            }
                                            var option = {
                                                title: "确认清除当前cdkey？",
                                                btn: parseInt("0011", 2),
                                                onOk: function () {
                                                    view.showServerMsg("cdkey已清空！<br>" + currentcdkey);
                                                    GM_setValue('lastcdkey', currentcdkey);
                                                    GM_setValue("cdkey", undefined);
                                                }
                                            }
                                            window.wxc.xcConfirm(txt, "custom", option);
                                        } else {
                                            let cdkey = /[\w]+/.exec(v);
                                            if (cdkey[0].length !== 64) {
                                                throw Error();
                                            } else {
                                                GM_setValue('lastcdkey', currentcdkey);
                                                GM_setValue('cdkey', cdkey[0]);
                                                let msg = "设置cdkey成功！<br><br>当前cdkey：<br>" + cdkey[0];
                                                if (currentcdkey) {
                                                    msg += "<br><br>" + "上一个cdkey为：<br>" + currentcdkey + "<br><strong style='color:red'>建议您保存上一个cdkey，否侧不可找回</strong>"
                                                }
                                                view.showServerMsg(msg);
                                            }
                                        }
                                    } catch (e) {
                                        view.showServerMsg("请输入有效的cdkey<br>如果您确定cdkey无问题，请更换其他浏览器后再试<br>更换之前记得保存好您的cdkey");
                                    }
                                }
                            },
                            onCancel: function (v) {
                            },
                            placeholder: placeholder
                        });
                    }
                }, {
                    style: {
                        "background-color": "rgba(195, 39, 43, 0.3)"
                    },
                    text: "无答案？点击获取",
                    onclick: fastGetCourse
                }, {
                    style: {
                        "background-color": "rgba(195, 39, 43, 0.3)"
                    },
                    text: "使用说明/更新脚本",
                    href: "https://greasyfork.org/zh-CN/scripts/396410"
                }, {
                    class: "domoocvideo",
                    style: {
                        "background-color": "rgba(195, 39, 43, 0.3)"
                    },
                    text: "开始刷课",
                    onclick: function () {
                        if ($('.domoocvideo').text() === "一键答题") {
                            domooc.getAnswer();
                        } else {
                            if (!domooc.learnCourse.started) {
                                if (domooc.learnCourse.getCurrentPageType()) {
                                    domooc.learnCourse.start();
                                    view.addInfo("不要最小化当前窗口", "也不要切换出当前页面", "否则你的观看时长不会被记录！");
                                    view.showServerMsg("不要最小化当前窗口，也不要切换出当前页面，否则你的观看时长不会被记录！<br>你可以多开浏览器以并行刷课。"
                                        + "<br>刷课件的时候不会自动翻页，请耐心等待，刷完之后会自动跳转到下一个内容。"
                                        + "<br>如果刷课过程中遇到各种莫名其妙的问题，请更换为360极速浏览器。");
                                    $(this).children().text("关闭刷课");
                                } else {
                                    window.alert("请先点开一个课件！");
                                }
                            } else {
                                domooc.learnCourse.terminate();
                                $(this).children().text("开始刷课");
                            }
                        }
                    }
                }, {
                    text: "向我留言",
                    onclick: function () {
                        var txt = "留言板";
                        window.wxc.xcConfirm(txt, window.wxc.xcConfirm.typeEnum.input, {
                            title: "留言板",
                            onOk: function (v) {
                                userMessage(v);
                            },
                            onCancel: function (v) {
                            }
                        });
                    }
                }, {
                    text: "用户信息/积分记录",
                    onclick: function () {
                        var txt = "上传给服务器的信息：";
                        let user = getInitialData().user;
                        for (let key in user) {
                            txt = txt + "<br>" + key + "：" + user[key]
                        }
                        let localcdkey = GM_getValue('cdkey');
                        if (localcdkey && localcdkey !== "undefined") {
                            txt = txt + "<br><br>" + `<span style='color:#16a951;font-size:bold;'>保存在本地的cdkey（更换账号后将使用此cdkey）：${localcdkey}</span>`
                        }
                        if (domooc.userinfo) {
                            let txt2 = "mooc账号使用情况：";
                            txt2 = txt2 + "<br>" + "总积分：" + "：" + domooc.userinfo.credits;
                            txt2 = txt2 + "<br>" + "已使用：" + "：" + domooc.userinfo.usedcredits;
                            // if (domooc.userinfo.cdkeys instanceof Array) {
                            //     domooc.userinfo.cdkeys.forEach((key, idx) => {
                            //         txt2 = txt2 + "<br>" + "cdkey" + idx + "：" + key;
                            //     })
                            // }
                            if (domooc.userinfo.cdkey) {
                                let cdkey = domooc.userinfo.cdkey;
                                txt2 = txt2 + "<br><br>" + "cdkey使用情况：";
                                txt2 = txt2 + "<br>" + "<span style='color:#16a951;font-size:bold;'>cdkey（请妥善保存，勿泄露给他人）" + "：" + cdkey.pattern + "</span>";
                                txt2 = txt2 + "<br>" + "总积分" + "：" + cdkey.credits;
                                txt2 = txt2 + "<br>" + "已使用" + "：" + cdkey.usedcredits;
                                function fixwidth(str, width) {
                                    let length = width - str.length;
                                    while (length-- > 0) {
                                        str += '&nbsp;&nbsp;';
                                    }
                                    return str;
                                }
                                cdkey.records.forEach(x => {
                                    txt2 = txt2 + "<br>" + `名称：${fixwidth(x.name, 4)} &nbsp;&nbsp; 扣除积分：${fixwidth(x.used + "", 4)}  时间：${new Date(x.timestamp).toLocaleString()} `;
                                });
                            }
                            txt = txt + "<br><br>" + txt2;
                        }
                        var option = {
                            title: "用户信息/积分记录",
                            btn: parseInt("0011", 2),

                        }
                        window.wxc.xcConfirm(txt, "custom", option);
                    }
                }, {
                    text: "版本信息",
                    onclick: function () {
                        view.showVersion();
                    }
                }, {
                    text: "收起面板",
                    onclick: function (e) {
                        let displaytext = $(this).children().text() === "<" ? "收起面板" : "<";
                        $(this).children().text(displaytext);
                        if (displaytext === "<") {
                            $(this).siblings().hide();
                            $("#sidebar ul:eq(0)").hide();
                            $(this).children().css("text-align", "right");
                            $(this).css("width", "min-content");
                            $(this).css("float", "right");
                        } else {
                            $(this).siblings().show();
                            $("#sidebar ul:eq(0)").show();
                            $(this).children().css("text-align", "center");
                            $(this).css("width", "auto");
                            $(this).css("float", "inherit");
                        }
                        view.sidebarOffset();
                        $(this).children().text(displaytext);
                    }
                }],
                refreshBtnList() {
                    let btnlist = this.sidebar.children()[1];
                    btnlist = $(btnlist);
                    btnlist.empty();
                    this.buttons.forEach(btn => {
                        let li = $(`<li class="u-greentab j-tabitem f-f0 domooc"><a class="f-thide f-fc3 " style="line-height:2em;font-size:1.2em;font-weight:bold;padding:0;text-align:center;background-color:transparent;" ${btn.href ? 'href="' + btn.href + '"' : ""} target="${btn.href ? "_blank" : ""}">${btn.text}</a></li>`);
                        if (typeof btn.onclick === "function") {
                            li.click(btn.onclick);
                        }
                        if (typeof btn.class === "string") {
                            li.addClass(btn.class);
                        }
                        if (btn.style) {
                            li.css(btn.style);
                        }
                        btnlist.append(li);
                    });
                    $("li.domooc a:hover").css("background-color", "transparent");
                    this.sidebarOffset();
                },
                addInfo(...msg) {
                    msg.forEach(ele => {
                        if (ele && (typeof ele !== "string") && ele.length) {
                            for (let i = 0; i < ele.length; i++) {
                                this.infoqueue.put(ele[i]);
                            }
                        } else if (typeof ele === "string") {
                            this.infoqueue.put(ele);
                        }
                    });
                    let infolist = this.sidebar.children()[0];
                    infolist = $(infolist);
                    infolist.empty();
                    let lis = [];
                    for (let i = 0; i < this.infoqueue.length; i++) {
                        let info = this.infoqueue.get(i);
                        if (info) {
                            let element;
                            if (info.startsWith("<error>")) {
                                let color = '#c3272b';
                                info = info.replace("<error>", "");
                                element = `<li class="u-greentab j-tabitem f-f0 first u-curtab"><a class="f-thide f-fc3" title=${info} style="font-size:1.2em;font-weight:750;background-color: ${color};line-height:2.5em;">${info}</a></li>`;
                            } else if (info.startsWith("<strong>")) {
                                info = info.replace("<strong>", "");
                                let color = 'RGB(85,185,41)';
                                element = `<li class="u-greentab j-tabitem f-f0 first u-curtab"><a class="f-thide f-fc3" title=${info} style="font-size:1.2em;font-weight:750;background-color: ${color};line-height:2.5em;">${info}</a></li>`;

                            } else {
                                element = `<li class="u-greentab j-tabitem f-f0 first u-curtab"><a class="f-thide f-fc3" title=${info} style="font-size:1em;line-height:2em;">${info}</a></li>`;
                            }
                            let li = $(element);
                            infolist.append(li);
                            lis.push(li);
                        }
                        if (lis.length === this.infoqueue.length) {
                            lis[0].fadeOut(1000, function () { view.sidebarOffset(); });
                            lis[this.infoqueue.length - 1].hide();
                            lis[this.infoqueue.length - 1].fadeIn(1000, function () { view.sidebarOffset(); });
                        }
                    }
                    this.sidebarOffset();
                },
                showServerMsg(msgobj) {
                    if (!msgobj) {
                        return;
                    }
                    if (msgobj.id) {
                        if (GM_getValue(msgobj.id)) {
                            return;
                        }
                    }
                    var txt = (typeof msgobj === "string") ? msgobj : msgobj.message;
                    var option = {
                        title: msgobj.title ? msgobj.title : "您有一条新消息",
                        btn: parseInt("0011", 2)
                    }

                    option.onOk = () => {
                        if (typeof msgobj.onOk === "string") {
                            window.open(msgobj.onOk);
                        }
                        if (msgobj.id) {
                            GM_setValue(msgobj.id, "true")
                        }
                    }
                    if (typeof msgobj.onCancel === "string") {
                        option.onCancel = () => { window.open(msgobj.onCancel); }
                    }
                    window.wxc.xcConfirm(txt, "custom", option);
                },
                sidebar: $('<div id="sidebar" style="position: absolute;"></div>'),
                searchbar: $(`    <div class="web-nav-right-part" style="position: absolute; z-index: 99999999;background-color:white;">
            <div class="u-baseinputui" style="height: 30px;"> <input type="text" id="domoocsearch"
                    class="j-textarea inputtxt" style="width: 430px;float:left;" placeholder="搜索答案">
                <span class="u-icon-search2 j-searchBtn" style="font-size:20px;line-height:30px;"></span>
            </div>
        </div>`),
                sidebarOffset: function () {
                    let sidebar = this.sidebar;
                    // let search = this.searchbar;
                    // search.offset({ top: $(window).scrollTop() + search.height() + 15, left: ($(window).width() - search.width()) / 2 });
                    sidebar.offset({ top: $(window).scrollTop() + $(window).height() / 2 - sidebar.height() / 2, left: $(window).width() - sidebar.width() });
                },
                showQuizbank(quizbank) {
                    if (!quizbank) {
                        quizbank = domooc.quizbank;
                    } else {
                        domooc.quizbank = quizbank;
                    }
                    if (!quizbank) {
                        courseCheck();
                        return;
                    }
                    function showQuizs(jnames, names) {
                        let length = names.length;
                        jnames.removeClass('f-thide');
                        if (jnames.length > 0) {
                            jnames.each(function () {
                                var title = $(this)[0].innerText.domoocformat();
                                clear = (text) => {
                                    return $(this).text().replace(/<题库答案数量：[\d]+?>/, "").replace("<fail>", "");
                                }
                                $(this).text()
                                if (names.indexOf(title) > -1 && length) {
                                    length--;
                                    let idx = names.indexOf(title);
                                    $(this).attr("style", "color:RGB(85,185,41)");
                                    $(this).html(clear($(this).text()) + ' <br>' + `&lt;题库答案数量：${quizbank[idx].anscnt}&gt;`);
                                } else {
                                    $(this).attr("style", "color:red");
                                    if ($(this).text().indexOf("<fail>") === -1) {
                                        $(this).text(clear($(this).text()) + "  <fail>");
                                    }
                                }
                            });
                            window.clearInterval(intHandler);
                        }
                    }
                    let intHandler = window.setInterval(() => {
                        let ele = document.querySelectorAll('div.m-learnbox div.u-moocbl');
                        let exist = false;
                        if (ele.length) {
                            for (let i = 0; i < ele.length; i++) {
                                if (ele[i].innerText.indexOf("源课程") > -1) {
                                    ele = ele[i];
                                    exist = true;
                                    break;
                                }
                            }
                        }
                        if (ele && exist) {
                            let spoc = ele.previousElementSibling;
                            if (spoc) {
                                let names = quizbank.map(x => x.isSourceCourse ? "" : x.name.domoocformat());
                                let jnames = $(spoc).find("div.titleBox h4.j-name");
                                showQuizs(jnames, names);
                            }
                            let source = ele.nextElementSibling;
                            if (source) {
                                let names = quizbank.map(x => x.isSourceCourse ? x.name.domoocformat() : "");
                                let jnames = $(source).find("div.titleBox h4.j-name");
                                showQuizs(jnames, names);
                            }
                        } else {
                            let names = quizbank.map(x => x.isSourceCourse ? "" : x.name.domoocformat());
                            let jnames = $("div.titleBox h4.j-name");
                            showQuizs(jnames, names);
                        }
                    }, 500);
                },
                showVersion() {
                    this.showServerMsg({
                        title: "当前版本：1.7.1",
                        message: "1. 现已修复spoc课程题库，并支持部分作业答题" +
                            "<br><br>2. 现在默认改为手动获取答案，如需自动获取请直接编辑脚本源码" +
                            "<br><br>3. 由于之前的规则漏洞被人利用，现答题次数改为积分制，具体规则如下：" +
                            "<br>自动答题时每题花费1个积分，1次测验最多花费15个积分" +
                            "<br>手动获取答案时每获取1个答案花费1个积分，上不封顶" +
                            "<br><strong style='color:red;'>之前用户的捐赠次数按1次10积分的比例转换为cdkey</strong>" +
                            "<br><strong style='color:red;'>之前用户上传的答案按1答案2积分计算，奖励将用cdkey的形式发放</strong>" +
                            "<br>由于题库已完善，今后上传答案将不再奖励积分" +
                            "<br><br>4. cdkey使用情况可点击用户信息按钮查看，只显示最近5次的记录" +
                            "<br><strong style='color:red;'>cdkey可多处使用，且一经生成不可更改，请妥善保管！</strong>"
                    });
                },
                init: function () {
                    let that = this;
                    let sidebar = this.sidebar;
                    let infolist = $('<ul id="j-courseTabList" class="tab u-tabul" style="padding:0 10px;"></ul>');
                    let btnlist = $('<ul id="j-courseTabList" class="tab u-tabul" style="padding:0 10px;"></ul>');
                    sidebar.append(infolist);
                    sidebar.append(btnlist);
                    $('body').append(sidebar);
                    // $('body').append(this.searchbar);
                    this.addInfo("插件加载成功");
                    this.refreshBtnList();
                    this.sidebarOffset();
                    // this.searchbar.width(450);
                    // this.searchbar.hide();
                    window.onscroll = function () {
                        that.sidebarOffset();
                    }
                    window.onresize = window.onscroll;
                },
            }
            domooc[_view] = view;
            domooc[learnCourse] = {
                pageTypes: ['discuss', 'video', 'test', 'doc', 'text'],
                rate: 0,
                changeCnt: 0,
                loaded: true,
                handler: 0,
                eventHandlerInt: 0,
                started: false,
                unitId: null,
                textPages: null,
                maxRepeat: 6,
                repeat: 6,
                pageProcessed: false,

                setPlayRate(rate) {
                    if (typeof rate === "number" && rate > 0 && rate <= 16) {
                        let video = document.querySelector('video');
                        if (video) {
                            video.playbackRate = rate;
                        }
                    }
                },
                getCurrentPageType() {
                    let current = this.getCurrentPosition();
                    let type = null;
                    this.pageTypes.forEach(t => {
                        if (this.checkClass(current.content, t)) {
                            type = t;
                        }
                    });
                    return type;
                },
                getCurrentPosition() {
                    let result = {};
                    let temp = $('#courseLearn-inner-box div.j-chapter div.u-select div.j-up.f-thide').text().trim2();
                    let chapter = $('#courseLearn-inner-box div.j-chapter div.u-select div.j-list').children();
                    chapter.each(function () { if ($(this).text().trim2() === temp) result.chapter = $(this) });
                    temp = $('#courseLearn-inner-box div.j-lesson div.u-select div.j-up.f-thide').text().trim2();
                    let lesson = $('#courseLearn-inner-box div.j-lesson div.u-select div.j-list').children();
                    lesson.each(function () { if ($(this).text().trim2() === temp) result.lesson = $(this) });
                    if (!result.lesson) {
                        result.lesson = $(lesson[0]);
                    }
                    result.content = $('#courseLearn-inner-box div.lscontent > ul > li.current');
                    return result;
                },
                getCurrentPosition() {
                    let result = {};
                    let temp = $('#courseLearn-inner-box div.j-chapter div.u-select div.j-up.f-thide').text().trim2();
                    let chapter = $('#courseLearn-inner-box div.j-chapter div.u-select div.j-list').children();
                    chapter.each(function () { if ($(this).text().trim2() === temp) result.chapter = $(this) });
                    temp = $('#courseLearn-inner-box div.j-lesson div.u-select div.j-up.f-thide').text().trim2();;
                    let lesson = $('#courseLearn-inner-box div.j-lesson div.u-select div.j-list').children();
                    lesson.each(function () { if ($(this).text().trim2() === temp) result.lesson = $(this) });
                    if (!result.lesson) {
                        result.lesson = $(lesson[0]);
                    }
                    result.content = $('#courseLearn-inner-box div.lscontent > ul > li.current');
                    return result;
                },
                checkClass(ele, cla) {
                    let span = ele.children('span.f-icon')[0];
                    let result = false;
                    if (span) {
                        if (cla instanceof Array) {
                            cla.forEach(str => {
                                if (span.classList.value.indexOf(str) > -1) {
                                    result = true;
                                }
                            });
                        } else if (typeof cla === "string") {
                            result = span.classList.value.indexOf(cla) > -1
                        }
                    }
                    return result;
                },
                _getNextContent(current, notnext) {
                    return new Promise((resolve, reject) => {
                        if (!current) {
                            current = this.getCurrentPosition();
                        }
                        let next = current.content;
                        if (!notnext) {
                            next = current.content.next();
                        }
                        let flag = true;
                        let that = this;
                        if (!next[0]) {
                            flag = false;
                            this.getNextLesson(current).then((finish) => {
                                if (!finish) {
                                    resolve(that._getNextContent(that.getCurrentPosition(), true));
                                } else {
                                    resolve(null);
                                }
                            });
                        }
                        if (flag) {
                            resolve(next);
                        }
                    });
                },
                _click(ele, resolve) {
                    ele.click();
                    let temp = window.setInterval(() => {
                        if (this.loaded) {
                            window.clearInterval(temp);
                            resolve();
                        }
                    }, 99);
                },
                getNextLesson(current) {
                    let that = this;
                    return new Promise((resolve, reject) => {
                        let next = current.lesson.next();
                        if (!next[0]) {
                            this.getNextChapter(current).then((finish) => {
                                if (!finish) {
                                    that._click(that.getCurrentPosition().lesson, resolve);
                                } else {
                                    resolve(finish);
                                }
                            });
                        } else {
                            that._click(next, resolve);
                        }
                    });
                },
                getNextChapter(current) {
                    let that = this;
                    return new Promise((resolve, reject) => {
                        let next = current.chapter.next();
                        if (!next[0]) {
                            resolve(true);
                        } else {
                            that._click(next, resolve);
                        }
                    });
                },
                getNextContent() {
                    let that = this;
                    return new Promise((resolve, reject) => {
                        let current = this.getCurrentPosition();
                        this._getNextContent(current).then((next) => {
                            if (next) {
                                next.click();
                            } else {
                                window.clearInterval(that.eventHandlerInt);
                                that.eventHandlerInt = 0;
                                $('.domoocvideo').click();
                                view.addInfo("所有课程观看完成！", "觉得好用请捐赠作者，谢谢！");
                                view.showServerMsg("所有课程观看完成！觉得好用请捐赠作者，谢谢！");
                            }
                            resolve();
                        });
                    });
                },
                async docfetch(page, unitId, finished) {
                    return window.fetch(`/web/j/courseBean.saveMocContentLearn.rpc?csrfKey=${domooc.csrf}`, {
                        body: `dto={"unitId":${unitId},"pageNum":${page},"finished":${finished},"contentType":3}`, // must match 'Content-Type' header
                        headers: {
                            'user-agent': 'Mozilla/4.0 MDN Example',
                            'content-type': 'application/x-www-form-urlencoded',
                            'edu-script-token': domooc.csrf
                        },
                        method: 'POST',
                    }).then(function (response) {
                        return response.json();
                    })
                },
                handlePageEvents() {
                    let that = this;
                    let running = false;
                    that.repeat = that.maxRepeat;
                    let init = () => {
                        that.repeat = that.maxRepeat;
                        running = false;
                        that.pageProcessed = false;
                    };
                    if (!that.eventHandlerInt) {
                        that.eventHandlerInt = window.setInterval(() => {
                            if (that.repeat-- < 0) {
                                that.getNextContent().then(init);
                            }
                            if (that.pageProcessed || running) {
                                return;
                            }
                            let current = that.getCurrentPosition();
                            domooc.console.log({ current, repeat: that.repeat, running, that });
                            if (that.checkClass(current.content, 'doc')) {
                                if (!usersetting.learnCourse.doc) {
                                    that.getNextContent().then(init);
                                    return;
                                }
                                if (that.unitId && that.textPages) {
                                    running = true;
                                    let unitId = that.unitId;
                                    let textPages = that.textPages;
                                    that.unitId = 0;
                                    that.textPages = 0;
                                    for (let i = 0; i < textPages; i++) {
                                        let finished = ((i + 1) === textPages);
                                        window.setTimeout(async () => {
                                            let res = null;
                                            that.repeat = that.maxRepeat;
                                            let cnt = 3;
                                            do {
                                                res = await that.docfetch(i + 1, unitId, finished);
                                            } while (cnt-- && (!res || !res.result));
                                            if (finished) {
                                                running = false;
                                                that.pageProcessed = true;
                                                that.getNextContent().then(init);
                                            }
                                        }, i * 1000);
                                    }
                                } else if (that.repeat < that.maxRepeat - 3) {
                                    view.showServerMsg("获取课件信息失败，<br>请关闭当前网页重新进入！");
                                }
                            } else if (that.checkClass(current.content, 'text')) {
                                that.pageProcessed = true;
                                window.setTimeout(() => {
                                    that.getNextContent().then(init);
                                }, 2000);
                            } else if (that.checkClass(current.content, 'video')) {
                                if (!usersetting.learnCourse.video) {
                                    that.getNextContent().then(init);
                                    return;
                                }
                                let video = document.querySelector('video');
                                document.querySelector('input.j-autoNext').checked = false;
                                $('input.j-autoNext').hide();
                                if (video) {
                                    that.setPlayRate(that.rate);
                                    if (typeof video.onended !== "function") {
                                        video.onended = () => {
                                            that.getNextContent().then(init);
                                        }
                                    }
                                    if (typeof video.ontimeupdate !== "function") {
                                        video.ontimeupdate = () => {
                                            that.repeat = that.maxRepeat;
                                        }
                                    }
                                }
                            } else if (that.checkClass(current.content, 'discuss')) {
                                if (!usersetting.learnCourse.discuss) {
                                    that.pageProcessed = true;
                                    that.getNextContent().then(init);
                                    return;
                                }
                                running = true;
                                let p = document.querySelectorAll('div.j-list div.j-content');
                                let frames = document.getElementsByTagName('iframe');
                                let contentBody = null;
                                if (frames.length) {
                                    for (let i = 0; i < frames.length; i++) {
                                        let fd = frames[i].contentDocument;
                                        let pe = fd.querySelector('body.view p');
                                        if (pe) {
                                            contentBody = pe;
                                            break;
                                        }
                                    }
                                }
                                let content = '';
                                if (p.length) {
                                    for (let i = 0; i < p.length; i++) {
                                        if (content.length < p[i].innerText.length) {
                                            content = p[i].innerText;
                                        }
                                    }
                                    contentBody.innerHTML = content + contentBody.innerHTML;
                                    let submit = document.querySelector('a.j-edit-btn.editbtn.u-btn-sm.u-btn-primary');
                                    if (submit) {
                                        submit.click();
                                        that.pageProcessed = true;
                                    }
                                }
                                window.setTimeout(() => {
                                    running = false;
                                    that.getNextContent().then(init);
                                }, 4000);
                            } else if (that.checkClass(current.content, 'test')) {
                                if (!usersetting.learnCourse.test) {
                                    that.pageProcessed = true;
                                    that.getNextContent().then(init);
                                    return;
                                }
                                let submit = document.querySelector('a.u-btn.j-submit');
                                if (submit && domooc.answerAll) {
                                    running = true;
                                    window.setTimeout(() => {
                                        if (submit.innerText === "提交") {
                                            domooc.answerAll = false;
                                            submit.click();
                                            that.pageProcessed = true;
                                        }
                                        window.setTimeout(() => {
                                            running = false;
                                            that.getNextContent().then(init);
                                        }, 2000);
                                    }, 2500);
                                }
                            }
                        }, 2500);
                    }
                },
                start() {
                    domooc.console.log('video control start');
                    this.handlePageEvents();
                    document.onvisibilitychange = () => {
                        if (!document.querySelectorAll('div.xcConfirm').length) {
                            view.showServerMsg("切换出当前页面后，你的观看时长将不会被记录！<br>如果没有触发此提示，说明你的观看时长会被服务器记录。<br>你可以多开浏览器以同时刷课，注意不要最小化。");
                        }
                    }
                    this.started = true;
                    this.rate = usersetting.learnCourse.playrate;
                    if (!this.handler) {
                        $('div.m-lessonDetail').bind('DOMSubtreeModified', () => { domooc.learnCourse.changeCnt++ });
                        this.handler = window.setInterval(() => {
                            if (this.changeCnt > 0) {
                                this.loaded = false;
                                this.changeCnt = 0;
                            } else {
                                this.loaded = true;
                            }
                            if (!this.getCurrentPageType()) {
                                this.terminate();
                            }
                        }, 1000);
                    }
                },
                terminate() {
                    $('div.m-lessonDetail').unbind('DOMSubtreeModified');
                    window.clearInterval(this.handler);
                    window.clearInterval(this.eventHandlerInt);
                    let video = document.querySelector('video');
                    this.rate = 0;
                    this.changeCnt = 0;
                    this.loaded = true;
                    this.handler = 0;
                    this.eventHandlerInt = 0;
                    this.started = false;
                    document.onvisibilitychange = null;
                    view.addInfo("已关闭刷课功能");
                    $('input.j-autoNext').show();
                    if (video) {
                        video.onended = null;
                        video.onpause = null;
                    }
                }
            }
            domooc[learnCourse][setPage] = function (page) {

                this.textPages = page;
            };
            domooc[learnCourse][setUnitId] = function (unitId) {
                this.unitId = unitId;
            };
            window.setPlayRate = domooc.learnCourse.setPlayRate;
        })


        domooc.execAfterLoaded = function (fname, param) {
            let handler = window.setInterval(() => {
                if (domooc.loaded) {
                    window.clearInterval(handler);
                    if (typeof fname === "string") {
                        domooc[fname](param);
                    } else if (fname instanceof Array) {
                        let func = domooc;
                        let that = null;
                        fname.forEach(f => {
                            that = func;
                            func = func[f];
                        });
                        func.call(that, param);
                    }
                }
            }, 300);
        };


        domooc.bindGetAnswer = function (obj) {
            let quizs = [];
            if (obj) {
                if (obj.objectiveQList && obj.objectiveQList.length) {
                    quizs = obj.objectiveQList;
                } else if (obj.subjectiveQList && obj.subjectiveQList.length) {
                    quizs = obj.subjectiveQList;
                }
            }
            $('div.j-title.title div.f-richEditorText.j-richTxt').each((idx, ele) => {
                let btn = $(`<p><a  class="f-fcgreen getAnswer"  data-id="${quizs[idx]}">查看答案</a></p>`);
                btn.children().click(function () {
                    domooc.getAnswerById(this, quizs[idx]);
                });
                $(ele).append(btn);
            });
        }

        let hookhandler = window.setInterval(() => {
            if (window.dwr && window.dwr.engine && !domooc._remoteHandleCallback) {
                window.clearInterval(hookhandler);
                domooc._remoteHandleCallback = window.dwr.engine._remoteHandleCallback;
                window.dwr.engine._remoteHandleCallback = function (batchId, status, obj) {
                    domooc._remoteHandleCallback(batchId, status, obj);
                    domooc.console.log({ batchId, status, obj });
                    if (!!obj) { //取得题目json;
                        $('.domoocvideo>a').text('开始刷课');
                        if ((obj.objectiveQList && obj.objectiveQList.length || obj.subjectiveQList && obj.subjectiveQList.length) && obj.submitStatus === 1) {
                            domooc.getAnswerflag = false;
                            domooc.quizpaper = obj;
                            if (usersetting.autogetanswer) {
                                domooc.execAfterLoaded(getAnswer, obj);
                            } else {
                                $('.domoocvideo>a').text("一键答题");
                                domooc.execAfterLoaded(bindGetAnswer, obj);
                                domooc.execAfterLoaded([_view, 'showServerMsg'], {
                                    id: "一键答题提示",
                                    title: "一键答题提示",
                                    message: "如需自动答题，请编辑源代码设置autogetanswer为true<br>或点击右侧一键答题按钮"
                                });
                            }
                        } else if (obj.objectiveQList && obj.submitStatus === 2) {
                            domooc.execAfterLoaded(analysisAnswer, obj);
                        } else if (obj.paper && obj.paper.objectiveQList && obj.paper.objectiveQList.length) {
                            domooc.execAfterLoaded(answerClassTest, obj.paper);
                        }
                        if (obj.textPages) {
                            domooc.execAfterLoaded([learnCourse, setPage], obj.textPages);
                        }
                        if (obj.unitId) {
                            domooc.execAfterLoaded([learnCourse, setUnitId], obj.unitId);
                        }
                    } else if (obj === 0 && domooc.quizbank) {
                        domooc.execAfterLoaded([_view, showQuizbank]);
                    }
                };
            }
        }, 20);
        function loadxcComfirm($) {
            window.wxc = window.wxc || {};
            let style = `<style type="text/css">/*垂直居中*/ \
    .verticalAlign{ vertical-align:middle; display:inline-block; height:100%; margin-left:-1px;}\
    .xcConfirm .xc_layer{position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: #666666; opacity: 0.5; z-index: 2147000000;}\
    .xcConfirm .popBox{position: absolute; background-color: #ffffff; z-index: 2147000001; width: max-content; height: max-content; border-radius: 5px; font-weight: bold; color: #535e66;}\
    .xcConfirm .popBox .ttBox{height: 30px; line-height: 30px; padding: 14px 30px; border-bottom: solid 1px #eef0f1;}\
    .xcConfirm .popBox .ttBox .tt{font-size: 18px; display: block; float: left; height: 30px; position: relative;}\
    .xcConfirm .popBox .ttBox .clsBtn{display: block; cursor: pointer; width: 12px; height: 12px; position: absolute; top: 22px; right: 30px; background: url(../img/icons.png) -48px -96px no-repeat;}\
    .xcConfirm .popBox .txtBox{margin: 40px 100px;  overflow: hidden;display:flex;margin:20px 40px}\
    .xcConfirm .popBox .txtBox .bigIcon{float: left; margin-right: 20px; width: 48px; height: 48px; background-image: url(../img/icons.png); background-repeat: no-repeat; background-position: 48px 0;}\
    .xcConfirm .popBox .txtBox textarea{float: left; width: 300px;  margin-top: 16px; line-height: 26px; }\
    .xcConfirm .popBox .txtBox textarea{width: 450px;height:200px;  border: solid 1px rgb(85,185,41);font-family: sans-serif; font-size: 18px; margin-top: 6px;}\
    .xcConfirm .popBox .btnArea{border-top: solid 1px #eef0f1;}\
    .xcConfirm .popBox .btnGroup{float: right;}\
    .xcConfirm .popBox .btnGroup .sgBtn{margin: 14px;}\
    .xcConfirm .popBox .sgBtn{display: block; cursor: pointer; float: left; width: 95px; height: 35px; line-height: 35px; text-align: center; color: #FFFFFF; border-radius: 5px;}\
    .xcConfirm .popBox .sgBtn.ok{background-color:rgb(85,185,41); color: #FFFFFF;}\
    .xcConfirm .popBox .sgBtn.cancel{background-color: rgb(248,248,248); color: #000;}\
    </style>`;
            $('body').append($(style));
            window.wxc.xcConfirm = function (popHtml, type, options) {
                var btnType = window.wxc.xcConfirm.btnEnum;
                var eventType = window.wxc.xcConfirm.eventEnum;
                let closeDefault = () => {
                    let onscroll = window.onscroll;
                    if (typeof window.onscroll === "function") {
                        window.onscroll = onscroll();
                    }
                };
                var popType = {
                    info: {
                        title: "信息",
                        icon: "0 0", //蓝色i
                        btn: btnType.ok
                    },
                    success: {
                        title: "成功",
                        icon: "0 -48px", //绿色对勾
                        btn: btnType.ok
                    },
                    error: {
                        title: "错误",
                        icon: "-48px -48px", //红色叉
                        btn: btnType.ok
                    },
                    confirm: {
                        title: "提示",
                        icon: "-48px 0", //黄色问号
                        btn: btnType.okcancel
                    },
                    warning: {
                        title: "警告",
                        icon: "0 -96px", //黄色叹号
                        btn: btnType.okcancel
                    },
                    input: {
                        title: "请输入...",
                        icon: "",
                        btn: btnType.okcancel
                    },
                    custom: {
                        title: "",
                        icon: "",
                        btn: btnType.ok
                    }
                };
                var itype = type ? type instanceof Object ? type : popType[type] || {} : {}; //格式化输入的参数:弹窗类型
                var config = $.extend(true, {
                    //属性
                    title: "", //自定义的标题
                    icon: "", //图标
                    btn: btnType.ok, //按钮,默认单按钮
                    //事件
                    onOk: $.noop, //点击确定的按钮回调
                    onCancel: $.noop, //点击取消的按钮回调
                    onClose: $.noop,// 弹窗关闭的回调, 返回触发事件
                    placeholder: null
                }, itype, options);

                var $txt = $("<p>").html(popHtml); //弹窗文本dom
                var $tt = $("<span>").addClass("tt").text(config.title); //标题
                var icon = config.icon;
                var $icon = icon ? $("<div>").addClass("bigIcon").css("backgroundPosition", icon) : "";
                var btn = config.btn; //按钮组生成参数

                var popId = creatPopId(); //弹窗索引

                var $box = $("<div>").addClass("xcConfirm"); //弹窗插件容器
                var $layer = $("<div>").addClass("xc_layer"); //遮罩层
                var $popBox = $("<div>").addClass("popBox"); //弹窗盒子
                var $ttBox = $("<div>").addClass("ttBox"); //弹窗顶部区域
                var $txtBox = $("<div>").addClass("txtBox"); //弹窗内容主体区
                var $btnArea = $("<div>").addClass("btnArea"); //按钮区域

                var $ok = $("<a>").addClass("sgBtn").addClass("ok").text("确定"); //确定按钮
                var $cancel = $("<a>").addClass("sgBtn").addClass("cancel").text("取消"); //取消按钮
                var $input = $("<textarea>").addClass("inputBox"); //输入框
                $input.attr("rows", "4");
                $input.attr("cols", "60");
                if (config.placeholder) {
                    $input.attr("placeholder", config.placeholder);
                } else if (qqgroup) {
                    $input.attr("placeholder", "有问题请加交流群：" + qqgroup);
                }
                $input.css("margin", "auto");
                var $clsBtn = $("<a>").addClass("clsBtn"); //关闭按钮

                //建立按钮映射关系
                var btns = {
                    ok: $ok,
                    cancel: $cancel
                };

                init();

                function init() {
                    //处理特殊类型input
                    if (popType["input"] === itype) {
                        $txt = $input;
                    }

                    creatDom();
                    bind();
                }

                function creatDom() {
                    if (popType["input"] === itype) {
                        $txt = $input;

                    }
                    $popBox.append(
                        $ttBox.append(
                            $clsBtn
                        ).append(
                            $tt
                        )
                    ).append(
                        $txtBox.append($icon).append($txt)
                    ).append(
                        $btnArea.append(creatBtnGroup(btn))
                    );
                    $box.attr("id", popId).append($layer).append($popBox);
                    $("body").append($box);
                    let setPopOffset = () => {
                        if ($popBox.width() > $(window).width() / 2) {
                            $popBox.width($(window).width() / 2);
                        }
                        $popBox.offset({ top: $(window).scrollTop() + $(window).height() / 2 - $popBox.height() / 2, left: $(window).width() / 2 - $popBox.width() / 2 });
                    };
                    setPopOffset();
                    let onscroll = window.onscroll;
                    window.onscroll = () => {
                        setPopOffset();
                        if (typeof onscroll === "function") {
                            onscroll();
                            return onscroll;
                        }
                    }
                }

                function bind() {
                    //点击确认按钮
                    $ok.click(doOk);

                    //回车键触发确认按钮事件
                    $(window).bind("keydown", function (e) {
                        if (e.keyCode == 13) {
                            if ($("#" + popId).length == 1) {
                                doOk();
                            }
                        }
                    });

                    //点击取消按钮
                    $cancel.click(doCancel);

                    //点击关闭按钮
                    $clsBtn.click(doClose);
                }

                //确认按钮事件
                function doOk() {
                    var $o = $(this);
                    var v = $.trim($input.val());
                    if ($input.is(":visible"))
                        config.onOk(v);
                    else
                        config.onOk();
                    $("#" + popId).remove();
                    closeDefault();
                    config.onClose(eventType.ok);
                }

                //取消按钮事件
                function doCancel() {
                    var $o = $(this);
                    config.onCancel();
                    $("#" + popId).remove();
                    closeDefault();
                    config.onClose(eventType.cancel);
                }

                //关闭按钮事件
                function doClose() {
                    $("#" + popId).remove();
                    closeDefault();
                    config.onClose(eventType.close);
                    $(window).unbind("keydown");
                }

                //生成按钮组
                function creatBtnGroup(tp) {
                    var $bgp = $("<div>").addClass("btnGroup");
                    $.each(btns, function (i, n) {
                        if (btnType[i] == (tp & btnType[i])) {
                            $bgp.append(n);
                        }
                    });
                    return $bgp;
                }

                //重生popId,防止id重复
                function creatPopId() {
                    var i = "pop_" + (new Date()).getTime() + parseInt(Math.random() * 100000); //弹窗索引
                    if ($("#" + i).length > 0) {
                        return creatPopId();
                    } else {
                        return i;
                    }
                }
            };

            //按钮类型
            window.wxc.xcConfirm.btnEnum = {
                ok: parseInt("0001", 2), //确定按钮
                cancel: parseInt("0010", 2), //取消按钮
                okcancel: parseInt("0011", 2) //确定&&取消
            };

            //触发事件类型
            window.wxc.xcConfirm.eventEnum = {
                ok: 1,
                cancel: 2,
                close: 3
            };

            //弹窗类型
            window.wxc.xcConfirm.typeEnum = {
                info: "info",
                success: "success",
                error: "error",
                confirm: "confirm",
                warning: "warning",
                input: "input",
                custom: "custom"
            };
        };
        if (!!debug) {
            window.domooc = domooc;
        }
        window.scriptloaded = true;
    }
    init(window, $, usersetting, GM_getValue, GM_setValue, GM_xmlhttpRequest);
})();