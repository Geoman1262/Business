from pathlib import Path
import re, sys

p = Path("portal.html")
if not p.exists():
    print("ERROR: Place this script beside your current portal.html and run it there.")
    sys.exit(1)
s = p.read_text(encoding="utf-8")
header = '<h1 id="welcome">حسابي</h1>'
new_header = '<div class="welcome-line"><h1 id="welcome">حسابي</h1><button id="inAppBell" class="inapp-bell" type="button" aria-label="فتح الإشعارات" aria-expanded="false" title="الإشعارات">🔔<span id="inAppUnread" class="inapp-badge hidden"></span></button></div>'
if header not in s: raise SystemExit("ERROR: expected welcome header not found.")
s = s.replace(header, new_header, 1)

# Replace the large inbox section by a compact hidden dropdown.
start = s.find('<section class="glass" id="inAppInbox">')
end = s.find('</section>', start) + len('</section>')
if start < 0 or end < len('</section>'): raise SystemExit("ERROR: inbox section not found.")
new_section = '<section id="inAppInbox" class="inapp-popover hidden" aria-label="مركز الإشعارات"><div class="inapp-popover-head"><h2>الإشعارات</h2><button id="markAllRead" type="button">قراءة الكل</button></div><div id="inAppList" class="inapp-list"><div class="empty">جارٍ تحميل الإشعارات...</div></div><button id="refreshInApp" type="button" style="margin-top:10px;background:#27496b">تحديث</button></section>'
s = s[:start] + new_section + s[end:]

css = '.welcome-line{display:flex;align-items:center;justify-content:space-between;gap:12px}.welcome-line h1{margin:0}.inapp-bell{position:relative;display:flex;align-items:center;justify-content:center;width:42px;height:42px;min-width:42px;padding:0;border-radius:50%;background:#27496b;border:1px solid #ffffff38;font-size:22px;line-height:1}.inapp-badge{position:absolute;top:-5px;right:-5px;min-width:19px;height:19px;display:flex;align-items:center;justify-content:center;border-radius:99px;background:#e63b55;color:#fff;font-size:11px;padding:0 5px;border:2px solid #102a43}.inapp-popover{position:relative;margin:10px 0 14px;padding:12px;border-radius:16px;background:#173a58;border:1px solid #ffffff2b;box-shadow:0 14px 32px #0004}.inapp-popover-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}.inapp-popover-head h2{margin:0}.inapp-popover-head button{width:auto;padding:7px 10px;font-size:13px}.inapp-list{max-height:55vh;overflow:auto}'
s = s.replace('.inapp-note{padding:12px 10px;', css + '.inapp-note{padding:12px 10px;', 1)
s = s.replace('badge.innerHTML=unread?`<span class="inapp-badge">${unread}</span>`:\'\'', 'badge.textContent=unread>99?"99+":String(unread);badge.classList.toggle("hidden",unread===0)')
anchor = "$('refreshInApp').addEventListener('click',loadNotifications);"
bind = """$('inAppBell').addEventListener('click',()=>{const panel=$('inAppInbox'),open=panel.classList.contains('hidden');panel.classList.toggle('hidden',!open);$('inAppBell').setAttribute('aria-expanded',String(open));if(open)loadNotifications()});
document.addEventListener('click',e=>{const panel=$('inAppInbox');if(!panel.classList.contains('hidden')&&!panel.contains(e.target)&&!$('inAppBell').contains(e.target)){panel.classList.add('hidden');$('inAppBell').setAttribute('aria-expanded','false')}});
"""
if anchor not in s: raise SystemExit("ERROR: refresh listener not found.")
s = s.replace(anchor, anchor + "\n" + bind, 1)
if 'id="inAppBell"' not in s or 'class="inapp-popover hidden"' not in s: raise SystemExit("ERROR: validation failed.")
backup = p.with_suffix(".html.backup")
backup.write_text(p.read_text(encoding="utf-8"), encoding="utf-8")
p.write_text(s, encoding="utf-8")
print("OK: portal.html updated; backup saved to", backup)
