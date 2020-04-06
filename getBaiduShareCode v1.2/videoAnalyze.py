#!/usr/bin/env python
# encoding: utf-8
'''
@author: surpasshr
@contact: hu.rui0530@gmail.com
@software: PyCharm
@file: videoAnalyze.py
@time: 2020/3/29 12:06
'''
import tkinter as tk
import webbrowser

window = tk.Tk()
window.title('视频解析')
window.geometry('700x100')
AnalyzeURL = 'https://timerd.me/static/cv.html?zwx='
def vidoeAnalyze():
    url = e.get()
    webbrowser.open(AnalyzeURL+url)

l = tk.Label(window, text='支持优酷vip，腾讯vip，爱奇艺vip，芒果vip，乐视vip，B站vip, A站vip...', height=2, font=('微软雅黑', 10))
l.pack()
e = tk.Entry(window, show=None, width=100)
e.pack()
b = tk.Button(window, command=vidoeAnalyze, text='解析')
b.pack()

tk.mainloop()