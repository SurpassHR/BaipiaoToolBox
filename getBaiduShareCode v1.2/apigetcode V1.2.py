#!/usr/bin/env python
# encoding: utf-8
'''
@author: surpasshr
@contact: hu.rui0530@gmail.com
@software: PyCharm
@file: apigetcode V1.2.py
@time: 2020/3/28 21:44

@note: 20-03-22 V1.0打开后新标签分享页储存提取码到剪贴板
@note: 20-03-23 V1.1版增加了后台运行识别剪贴板中的内容，判断是否为链接并执行默认功能
@note: 20-03-23 V1.2预计添加内容：vip视频解析 https://timerd.me/static/cv.html?zwx=
@note: 20-03-29 V1.2重写了算法，不会再影响到剪贴板的内容，视频解析和用户界面推迟到V1.3添加
'''
# test:短链接:https://pan.baidu.com/s/1qXT8Rwg   长连接:https://pan.baidu.com/share/init?surl=qXT8Rwg
# 失效:http://pan.baidu.com/share/link?shareid=3190587944&uk=95735712
# 页面不存在链接:http://pan.baidu.com/share/link?shareid=323508170
# 用户分享:

import requests #3>
import pyperclip #3>
import webbrowser
import time
import os
import re

APIURL = 'https://node.pnote.net/public/pan?url='
earlyContent = ''
laterContent = ''
check = True

def checkContent(): # 决定是否继续循环
    global earlyContent
    global laterContent
    global check
    laterContent = earlyContent
    earlyContent = pyperclip.paste()
    if earlyContent != laterContent:
        check = True
    else:
        check = False

def monitor():
    global check
    downurl = pyperclip.paste()
    judge1 = re.findall('pan.baidu.com/s/', downurl)
    judge2 = re.findall('pan.baidu.com/share/', downurl)
    if judge1 != [] or judge2 != []: # 检测剪贴板中是否有疑似百度云链接的字符串
        if 'shareid' in downurl:
            pandata = requests.get(downurl).text
            check = False
            if 'error-img' in pandata:
                data_regex = re.compile('"uk":(\d*)')
                shareerid = re.findall(data_regex, pandata)[0]
                shareerhome = 'https://pan.baidu.com/share/home?uk={}&view=share#category/type=0'.format(shareerid)
                webbrowser.open(shareerhome)
                processing = '啊哦，你来晚了，分享的文件已经被删除了，下次要早点哟。\n分享者id {} 主页已在新标签页打开\n'.format(shareerid)
                print(processing)
                check = False
                return 'false'
            elif 'error-main clearfix' in pandata:
                processing = '啊哦，你所访问的页面不存在了。\n可能的原因：\n1.在地址栏中输入了错误的地址。\n2.你点击的某个链接已过期。'
                print(processing)
                check = False
                return 'false'
        else:
            return 'true'

def getShareCode():
    global check
    downurl = pyperclip.paste()
    r = requests.get(APIURL+downurl)
    regex = re.compile('"access_code":"(.*?)"')
    status_reg = re.compile('"status":(\w{4,5})')
    msg_reg = re.compile('"messages":"(.*?)"')
    status = re.findall(status_reg, r.text)[0]
    if status != 'true': # 未能成功获得提取码
        processing = re.findall(msg_reg, r.text)[0]
        print(processing) # 会报的错: 1.参数不合法 2.暂未收录该连接的提取码
    else: # 唯一通过得到提取码并打开链接的情况
        result = re.findall(regex, r.text)
        webbrowser.open(downurl)
        pyperclip.copy(result[0]) # 把提取码放到剪贴板里
        processing = '网盘提取码 {} 已保存到剪贴板\n'.format(result[0])
        print(processing)

def processLine():
    while True:
        time.sleep(0.25)
        checkContent() # 判断剪贴板无法正常访问的url是否已经变化
        if check:
            break
    if monitor() == 'true':
        getShareCode()

if __name__ == '__main__':
    print('正在检测剪贴板内容...\n\
宁可以无视该窗口直接去网页复制所需要的链接\n\
如果没有意料中的响应\n\
宁可以返回本窗口查看问题原因')
    while True:
        time.sleep(0.5)
        processLine()
