import tkinter as tk
def window():
    window = tk.Tk()
    window.title('my window')
    window.geometry('300x200')

    e = tk.Entry(show=None)
    e.pack()
    def insert_end():
        var = e.get()
        t.insert('end', var)

    def insert_point():
        var = e.get()
        t.insert('insert', var)

    b1 = tk.Button(text='insert end', width=15, height=2, command=lambda :insert_end())
    b1.pack()
    b2 = tk.Button(text='insert point', width=15, height=2, command=lambda :insert_point())
    b2.pack()
    t = tk.Text()
    t.pack()

    tk.mainloop()
window()