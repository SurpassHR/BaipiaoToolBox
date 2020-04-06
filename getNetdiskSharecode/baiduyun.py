#!/usr/bin/env python
# encoding: utf-8
'''
@author: surpasshr
@contact: hu.rui0530@gmail.com
@software: PyCharm
@file: baiduyun.py
@time: 2020/3/2118:08
'''
import time
from selenium import webdriver
import re
def get_share_code(downurl):
    opt = webdriver.ChromeOptions()
    opt.headless = True
    path = 'D:\Program Files\Cent Browser\CentBrowser\Application\chromedriver.exe'
    driver = webdriver.Chrome(executable_path=path)
    url = 'https://pan.baiduwp.com/'
    driver.get(url)
    driver.implicitly_wait(10)
    input = driver.find_elements_by_xpath('/html/body/div[1]/div/div/div[2]/form/div[1]/input') #/html/body/div[1]/div/div/div[2]/form/div[1]/input
    input[0].send_keys(downurl)
    button = driver.find_element_by_xpath('/html/body/div[1]/div/div/div[2]/form/button') #/html/body/div[1]/div/div/div[2]/form/button
    button.click()
    sharecode = driver.find_element_by_xpath('/html/body/div[1]/div[1]/ul/li/a').get_attribute('href') #/html/body/div[1]/div[1]/ul/li/a
    rg = re.compile('pwd=(\w*)')
    rs = re.findall(rg, sharecode)
    print('网盘提取码为:{}'.format(rs[0]))

def writecode(downurl):
    path = 'D:\Program Files\Cent Browser\CentBrowser\Application\chromedriver.exe'
    driver2 = webdriver.Chrome(executable_path=path)
    driver2.get(downurl)


def main():
    downurl = input('输入网盘链接:')# input('输入云盘链接:') https://pan.baidu.com/s/1qXT8Rwg
    timestart = time.time()
    get_share_code(downurl)
    writecode(downurl)
    timeend = time.time()
    spendtime = timeend - timestart
    print('花费时间:{:.2f}秒'.format(spendtime))


main()