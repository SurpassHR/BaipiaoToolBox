#!/usr/bin/env python
# encoding: utf-8
'''
@author: surpasshr
@contact: hu.rui0530@gmail.com
@software: PyCharm
@file: apigetcode V1.1.py
@time: 2020/3/21 20:43

@note: 20-03-22 V1.0打开后新标签分享页储存提取码到剪贴板
@note: 20-03-23 V1.1版增加了后台运行识别剪贴板中的内容，判断是否为链接并执行默认功能
@note: 20-03-23 V1.2预计添加内容：vip视频解析 https://timerd.me/static/cv.html?zwx=
'''
# test:短链接:https://pan.baidu.com/s/1qXT8Rwg   长连接:https://pan.baidu.com/share/init?surl=qXT8Rwg
# 失效:http://pan.baidu.com/share/link?shareid=3190587944&uk=95735712
# 需要转换链接:http://pan.baidu.com/share/link?shareid=323508170
# 用户分享:
import requests #3>
import pyperclip #3>
import webbrowser
import time
import os
import re
APIURL = 'https://node.pnote.net/public/pan?url='

def getShareCode(downurl): # level 3
    r = requests.get(APIURL+downurl)
    regex = re.compile('"access_code":"(.*?)"')
    status_reg = re.compile('"status":(\w{4,5})')
    msg_reg = re.compile('"messages":"(.*?)"')
    status = re.findall(status_reg, r.text)[0]
    if status != 'true': # 未能成功获得提取码
        msg = re.findall(msg_reg, r.text)[0]
        print(msg+'\n') # 会报的错: 1.参数不合法 2.暂未收录该连接的提取码
        pyperclip.copy('') # 剪贴板清空
        return '1'
    else: # 唯一通过得到提取码并打开链接的情况
        result = re.findall(regex, r.text)
        webbrowser.open(downurl)
        pyperclip.copy(result[0]) # 把提取码放到剪贴板里
        print('网盘提取码 {} 已保存到剪贴板\n'.format(result[0]))
        return 'wait'

def judge(downurl): # level 2
    if 'shareid' in downurl:        # 判断是长链接http://pan.baidu.com/share/link?shareid=323508170
        pan_data = requests.get(downurl).text
        if 'error-img' in pan_data: # 判断是失效长链接
            print('链接文件已失效!\n')
            data_regex = re.compile('"uk":(\d*)')
            shareerid = re.findall(data_regex, pan_data)[0]
            shareerhome = 'https://pan.baidu.com/share/home?uk={}&view=share#category/type=0'.format(shareerid)
            webbrowser.open(shareerhome)
            print('分享者id {} 主页已在新标签页打开\n'.format(shareerid))
            pyperclip.copy('0')
            return '2'
        else:                       # 判断是未失效长链接
            print('请复制新页面地址栏中转换的链接\n')
            webbrowser.open(downurl)
            pyperclip.copy('') # 清空剪贴板
            return '0'
    else:
        return 'pass'

def monitor(): # level 1
    downurl = pyperclip.paste()
    judge1 = re.findall('pan.baidu.com/s/', downurl)
    judge2 = re.findall('pan.baidu.com/share/', downurl)
    if judge1 != [] or judge2 != []: # 判断是否含有标准链接格式 是->Next
        situ = judge(downurl)
        if situ == 'pass': # 判断不为0时或True时执行
            case = getShareCode(downurl)
            switch_case(case)

def switch_case(case):
    if case == 'wait':
        pass
    if case == '1':
        pass

def processLine():
    print('正在检测剪贴板内容...\n宁可以无视该窗口直接去网页复制所需要的链接\n如果没有意料中的响应\n宁可以返回本窗口查看问题原因\n')
    while True:
        time.sleep(0.5)
        monitor()

if __name__ == '__main__':
    processLine()
    os.system('pause')
