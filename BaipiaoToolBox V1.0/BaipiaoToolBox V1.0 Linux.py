#!/usr/bin/env python
# encoding: utf-8
'''
@author: surpasshr
@contact: hu.rui0530@gmail.com
@software: PyCharm
@file: BaipiaoBox.py
@time: 2020/3/29 16:20

@note: 20-03-22 V1.0打开后新标签分享页储存提取码到剪贴板
@note: 20-03-23 V1.1版增加了后台运行识别剪贴板中的内容，判断是否为链接并执行默认功能
@note: 20-03-23 V1.2预计添加内容：vip视频解析 https://timerd.me/static/cv.html?zwx=
@note: 20-03-27 V1.2重写了算法，不会再影响到剪贴板的内容，视频解析和用户界面推迟到V1.3添加
@note: 20-03-29 V1.3第一次布局图形界面，省略了原来复杂的操作，更加简明
'''
# tkinter第一次应用，relwidth, relheight分别是相对于窗口的大小
# relx(从上面起), rely(从左面起)是相对于窗口的位置

import tkinter as tk
import requests
import webbrowser
import pyperclip
import re

APIURL = 'https://node.pnote.net/public/pan?url='
VIDEOURL = 'https://timerd.me/static/cv.html?zwx='
HEIGHT = 300
WIDTH = 600

def getShareCode(entry):
    judge1 = re.findall('pan.baidu.com/s/', entry)
    judge2 = re.findall('pan.baidu.com/share/', entry)
    if judge1 != [] or judge2 != []:
        if 'shareid' in entry:
            pandata = requests.get(entry).text
            if 'error-img' in pandata:
                data_regex = re.compile('"uk":(\d*)')
                shareerid = re.findall(data_regex, pandata)[0]
                shareerhome = 'https://pan.baidu.com/share/home?uk={}&view=share#category/type=0'.format(shareerid)
                webbrowser.open(shareerhome)
                processing = '啊哦，你来晚了，分享的文件已经被删除了，下次要早点哟。\n分享者id {} 主页已在新标签页打开\n'.format(shareerid)
                label['text'] = processing
            elif 'error-main clearfix' in pandata:
                processing = '啊哦，你所访问的页面不存在了。\n可能的原因：\n1.在地址栏中输入了错误的地址。\n2.你点击的某个链接已过期。'
                label['text'] = processing
        else:
            response = requests.get(APIURL+entry).json()
            status = response['status']
            if status:
                code = response['access_code']
                label['text'] = '网盘提取码 {} 已保存到剪贴板\n'.format(code)
                webbrowser.open(entry)
                pyperclip.copy(code)
            else:
                message = response['messages']
                label['text'] = message
    else:
        label['text'] = '非法链接参数'

        # 网站test:
        # https://pan.baidu.com/s/1qXT8Rwg    :
        # {'status': True, 'access_url': 'https://pan.baidu.com/s/1qXT8Rwg', 'access_code': 'fvsg'}
        # http://pan.baidu.com/share/link?shareid=3190587944&uk=95735712   :
        # {'messages': '参数不合法', 'status': False}
        # https://pan.baidu.com/s/1q4T-5yYNfXRjLdiRcqnZkw   :
        # {'messages': '暂未收录该链接的提取码', 'status': False}

def AnalyzeVideo(entry):
    webbrowser.open(VIDEOURL+entry)

    #.*//m.youku.com/v
    #.*//m.youku.com/a
    #.*//v.youku.com/v_
    #.*//.*iqiyi.com/v

root = tk.Tk()
root.title('白嫖工具箱')
root.attributes("-topmost", True)
root.geometry('-0+0')

canvas = tk.Canvas(root, height=HEIGHT, width=WIDTH)
canvas.pack()

upper_frame = tk.Frame(root, bg='#2E9AFE', bd=3)
upper_frame.place(relx=0.5, rely=0.05, relwidth=0.9, relheight=0.1, anchor='n')

lower_frame = tk.Frame(root, bg='#2E9AFE', bd=3)
lower_frame.place(relx=0.5, rely=0.2, relwidth=0.9, relheight=0.1, anchor='n')

entry1 = tk.Entry(upper_frame, font=('fangsong ti', 13), show=None)
entry1.insert('end', '在此输入云盘链接')
entry1.place(relwidth=0.65, relheight=1)

button1 = tk.Button(upper_frame, font=('fangsong ti', 13), text='获取', command=lambda :getShareCode(entry1.get()))
button1.place(relx=0.7, relheight=1, relwidth=0.3)

entry2 = tk.Entry(lower_frame, font=('fangsong ti', 13))
entry2.insert('end', '在此输入vip视频链接')
entry2.place(relwidth=0.65, relheight=1)

button2 = tk.Button(lower_frame, font=('fangsong ti', 13), text='解析', command=lambda :AnalyzeVideo(entry2.get()))
button2.place(relx=0.7, relheight=1, relwidth=0.3)

label = tk.Label(root, bg='white', font=('fangsong ti', 13))
label.place(relheight=0.4, relwidth=0.9, relx=0.5, rely=0.5, anchor='n')



root.mainloop()