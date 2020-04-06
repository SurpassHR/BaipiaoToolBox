#!/usr/bin/env python
# encoding: GBK
'''
@author: surpasshr
@contact: hu.rui0530@gmail.com
@software: PyCharm
@file: apigetcode V1.0.py
@time: 2020/3/21 20:43
'''
# test:短链接:https://pan.baidu.com/s/1qXT8Rwg   长连接:https://pan.baidu.com/share/init?surl=qXT8Rwg
# 失效:http://pan.baidu.com/share/link?shareid=3190587944&uk=95735712
# 用户分享:
import requests
import pyperclip
import webbrowser
import os
import re

def getShareCode(apiurl, downurl):
    r = requests.get(apiurl+downurl)
    regex = re.compile('"access_code":"(.*?)"')
    status_reg = re.compile('"status":(\w{4,5})')
    msg_reg = re.compile('"messages":"(.*?)"')
    status = re.findall(status_reg, r.text)[0]
    if status != 'true':
        msg = re.findall(msg_reg, r.text)
        print(msg)
    else:
        result = re.findall(regex, r.text)
        webbrowser.open(downurl)
        pyperclip.copy(result[0])
        print('网盘提取码 {} 已保存到剪贴板。'.format(result[0]))

def judge(downurl):
    judge1 = re.findall('pan.baidu.com/s/', downurl)
    judge2 = re.findall('pan.baidu.com/share/', downurl)
    if judge1 != [] or judge2 != []:
        if 'shareid' in downurl:
            pan_data = requests.get(downurl).text
            if 'error-img' in pan_data:
                print('链接文件已失效!')
                data_regex = re.compile('"uk":(\d*)')
                shareerid = re.findall(data_regex, pan_data)[0]
                shareerhome = 'https://pan.baidu.com/share/home?uk={}&view=share#category/type=0'.format(shareerid)
                webbrowser.open(shareerhome)
                print('分享者id {} 主页已在新标签页打开'.format(shareerid))
                os.system('pause')
            else:
                print('请将该链接粘贴到浏览器地址栏复制转换过的链接再打开本程序')
                os.system('pause')
        else:
            return 1
    else:
        print('这好像不是网盘链接，去看看是不是粘错了?')
        os.system('pause')

def processLine():
    apiurl = 'https://node.pnote.net/public/pan?url='
    downurl = pyperclip.paste()
    if judge(downurl):
        getShareCode(apiurl, downurl)

if __name__ == '__main__':
    processLine()
    os.system('pause')
