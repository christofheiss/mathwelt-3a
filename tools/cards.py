# Token-Karten (8 pro A4) mit QR-Code aus private/tokens.json erzeugen.
# Aufruf: python3 tools/cards.py   (braucht reportlab)
import json
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from reportlab.graphics.barcode import qr
from reportlab.graphics.shapes import Drawing
from reportlab.graphics import renderPDF
d=json.load(open('private/tokens.json'))
c=canvas.Canvas('private/MathWelt3A_Token-Karten.pdf', pagesize=A4)
W,H=A4; cw,ch=95*mm,66*mm; mx=(W-2*cw)/2; my=(H-4*ch)/2
toks=d['tokens']
for i,t in enumerate(toks):
    if i and i%8==0: c.showPage()
    k=i%8; col=k%2; row=k//2
    x=mx+col*cw; y=H-my-(row+1)*ch
    c.setDash(3,3); c.setStrokeGray(.5); c.rect(x,y,cw,ch); c.setDash()
    c.setFillColorRGB(.37,.62,.25); c.rect(x,y+ch-11*mm,cw,11*mm,fill=1,stroke=0)
    c.setFillGray(1); c.setFont('Helvetica-Bold',14); c.drawString(x+5*mm,y+ch-7.5*mm,'MathWelt 3A')
    c.setFont('Helvetica',8); c.drawRightString(x+cw-5*mm,y+ch-7.5*mm,'persönlicher Zugang · nicht weitergeben')
    c.setFillGray(0); c.setFont('Helvetica-Bold',26); c.drawString(x+5*mm,y+ch-25*mm,t['id'])
    c.setFont('Helvetica',8); c.drawString(x+5*mm,y+ch-30*mm,'Deine ID' + (' (Test Lehrperson)' if t['id']=='3A99' else ''))
    c.setFont('Courier-Bold',11.5); c.drawString(x+5*mm,y+ch-40*mm,t['token'])
    c.setFont('Helvetica',7.5)
    for j,l in enumerate(['1. Spiel im Browser öffnen:','   ______________________________','2. Code eintippen oder QR-Code scannen','3. Am Schluss «Speichern» und Datei abgeben']):
        c.drawString(x+5*mm,y+ch-47*mm-j*3.6*mm,l)
    w=qr.QrCodeWidget(t['token']); b=w.getBounds(); s=40*mm
    dr=Drawing(s,s,transform=[s/(b[2]-b[0]),0,0,s/(b[3]-b[1]),0,0]); dr.add(w)
    renderPDF.draw(dr,c,x+cw-s-3*mm,y+5*mm)
c.save(); print('ok')
