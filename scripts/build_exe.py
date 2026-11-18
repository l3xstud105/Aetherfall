import struct
import os
import zipfile

def align(v, a):
    return (v + a - 1) & ~(a - 1)

def build_standalone_exe(html_bytes, output_path):
    PAGE_SIZE = 0x1000
    FILE_ALIGN = 0x200

    # Layout:
    # 0x0000 - Headers (0x400)
    # 0x1000 - .text (code) (0x200 file / 0x1000 virt)
    # 0x2000 - .rdata (imports & strings) (0x400 file / 0x1000 virt)
    # 0x3000 - .pdata (payload: embedded index.html) (aligned to FILE_ALIGN / PAGE_SIZE)
    
    payload_len = len(html_bytes)
    payload_raw_size = align(payload_len, FILE_ALIGN)
    payload_virt_size = align(payload_len, PAGE_SIZE)

    text_rva = 0x1000
    rdata_rva = 0x2000
    payload_rva = 0x3000

    # In .rdata:
    # 5 imports from KERNEL32.dll:
    # 0: CreateFileA
    # 1: WriteFile
    # 2: CloseHandle
    # 3: WinExec
    # 4: ExitProcess

    # IAT: 5 * 8 bytes + 8 bytes null = 48 bytes (0x30)
    iat_rva = rdata_rva
    # ILT: 5 * 8 bytes + 8 bytes null = 48 bytes (0x30)
    ilt_rva = rdata_rva + 0x30
    # IDT: 20 bytes (descriptor) + 20 bytes (null) = 40 bytes (0x28)
    idt_rva = rdata_rva + 0x60

    # Hint/Names
    # 0: CreateFileA (2 + 12 = 14)
    # 1: WriteFile (2 + 10 = 12)
    # 2: CloseHandle (2 + 12 = 14)
    # 3: WinExec (2 + 8 = 10)
    # 4: ExitProcess (2 + 12 = 14)
    h_create = rdata_rva + 0x90
    h_write  = h_create + 14
    h_close  = h_write + 12
    h_winexec = h_close + 14
    h_exit   = h_winexec + 10
    dll_name = h_exit + 14

    str_filename = dll_name + 16 # "index.html\0"
    str_cmd = str_filename + 16  # command string

    cmd_bytes = b'cmd.exe /c start \"\" msedge --app=\"%CD%\\index.html\" 2>nul || start \"\" index.html\x00'

    rdata = bytearray(0x400)
    # Fill IAT
    struct.pack_into('<QQQQQQ', rdata, 0x00, h_create, h_write, h_close, h_winexec, h_exit, 0)
    # Fill ILT
    struct.pack_into('<QQQQQQ', rdata, 0x30, h_create, h_write, h_close, h_winexec, h_exit, 0)
    # Fill IDT
    struct.pack_into('<IIIII', rdata, 0x60, ilt_rva, 0, 0, dll_name, iat_rva)

    # Hint entries:
    def write_hint(offset, name):
        struct.pack_into('<H', rdata, offset, 0)
        name_bytes = name.encode('ascii') + b'\x00'
        rdata[offset+2 : offset+2+len(name_bytes)] = name_bytes

    write_hint(h_create - rdata_rva, 'CreateFileA')
    write_hint(h_write - rdata_rva, 'WriteFile')
    write_hint(h_close - rdata_rva, 'CloseHandle')
    write_hint(h_winexec - rdata_rva, 'WinExec')
    write_hint(h_exit - rdata_rva, 'ExitProcess')

    dll_str = b'KERNEL32.dll\x00'
    rdata[dll_name - rdata_rva : dll_name - rdata_rva + len(dll_str)] = dll_str

    fn_str = b'index.html\x00'
    rdata[str_filename - rdata_rva : str_filename - rdata_rva + len(fn_str)] = fn_str

    rdata[str_cmd - rdata_rva : str_cmd - rdata_rva + len(cmd_bytes)] = cmd_bytes

    # .text assembly
    text = bytearray(0x200)
    code = bytearray()
    
    # 0: push rbx (53)
    code += b'\x53'
    # 1: sub rsp, 48 (48 83 ec 30)
    code += b'\x48\x83\xec\x30'
    
    # lea rcx, [rip + str_filename]
    # instruction length = 7 bytes (48 8d 0d xx xx xx xx)
    cur_ip = text_rva + len(code) + 7
    code += b'\x48\x8d\x0d' + struct.pack('<i', str_filename - cur_ip)
    
    # mov edx, 0x40000000 (GENERIC_WRITE) (ba 00 00 00 40)
    code += b'\xba\x00\x00\x00\x40'
    # xor r8d, r8d (45 31 c0)
    code += b'\x45\x31\xc0'
    # xor r9d, r9d (45 31 c9)
    code += b'\x45\x31\xc9'
    
    # mov qword ptr [rsp + 0x20], 2 (CREATE_ALWAYS)
    code += b'\x48\xc7\x44\x24\x20\x02\x00\x00\x00'
    # mov qword ptr [rsp + 0x28], 0x80 (FILE_ATTRIBUTE_NORMAL)
    code += b'\x48\xc7\x44\x24\x28\x80\x00\x00\x00'
    # mov qword ptr [rsp + 0x30], 0
    code += b'\x48\xc7\x44\x24\x30\x00\x00\x00\x00'
    
    # call qword ptr [rip + iat_CreateFileA]
    cur_ip = text_rva + len(code) + 6
    code += b'\xff\x15' + struct.pack('<i', iat_rva - cur_ip)
    
    # cmp rax, -1
    code += b'\x48\x83\xf8\xff'
    # je launch (short jump, calculate offset after)
    je_pos = len(code)
    code += b'\x74\x00' # placeholder
    
    # mov rbx, rax (save h)
    code += b'\x48\x89\xc3'
    # mov rcx, rax (hFile)
    code += b'\x48\x89\xc1'
    
    # lea rdx, [rip + payload_rva]
    cur_ip = text_rva + len(code) + 7
    code += b'\x48\x8d\x15' + struct.pack('<i', payload_rva - cur_ip)
    
    # mov r8d, payload_len (41 b8 xx xx xx xx)
    code += b'\x41\xb8' + struct.pack('<I', payload_len)
    
    # lea r9, [rsp + 0x28] (lpNumberOfBytesWritten)
    code += b'\x4c\x8d\x4c\x24\x28'
    
    # mov qword ptr [rsp + 0x20], 0 (lpOverlapped)
    code += b'\x48\xc7\x44\x24\x20\x00\x00\x00\x00'
    
    # call qword ptr [rip + iat_WriteFile] (iat_rva + 8)
    cur_ip = text_rva + len(code) + 6
    code += b'\xff\x15' + struct.pack('<i', (iat_rva + 8) - cur_ip)
    
    # mov rcx, rbx
    code += b'\x48\x89\xd9'
    
    # call qword ptr [rip + iat_CloseHandle] (iat_rva + 16)
    cur_ip = text_rva + len(code) + 6
    code += b'\xff\x15' + struct.pack('<i', (iat_rva + 16) - cur_ip)
    
    # target for je launch:
    launch_offset = len(code)
    code[je_pos + 1] = launch_offset - (je_pos + 2)
    
    # lea rcx, [rip + str_cmd]
    cur_ip = text_rva + len(code) + 7
    code += b'\x48\x8d\x0d' + struct.pack('<i', str_cmd - cur_ip)
    
    # xor edx, edx (SW_HIDE)
    code += b'\x31\xd2'
    
    # call qword ptr [rip + iat_WinExec] (iat_rva + 24)
    cur_ip = text_rva + len(code) + 6
    code += b'\xff\x15' + struct.pack('<i', (iat_rva + 24) - cur_ip)
    
    # xor ecx, ecx
    code += b'\x31\xc9'
    
    # call qword ptr [rip + iat_ExitProcess] (iat_rva + 32)
    cur_ip = text_rva + len(code) + 6
    code += b'\xff\x15' + struct.pack('<i', (iat_rva + 32) - cur_ip)
    
    # add rsp, 48
    code += b'\x48\x83\xc4\x30'
    # pop rbx
    code += b'\x5b'
    # ret
    code += b'\xc3'
    
    text[0:len(code)] = code

    # Payload section (.pdata)
    payload_section = bytearray(payload_raw_size)
    payload_section[0:payload_len] = html_bytes

    # Headers
    headers_size = 0x400
    headers = bytearray(headers_size)
    headers[0:2] = b'MZ'
    struct.pack_into('<I', headers, 0x3C, 0x80)
    headers[0x80:0x84] = b'PE\x00\x00'

    # File Header (20 bytes)
    # NumberOfSections = 3
    struct.pack_into('<HHIIIHH', headers, 0x84, 0x8664, 3, 0, 0, 0, 0xF0, 0x0022)

    # Optional Header PE32+ (240 bytes)
    total_image_size = payload_rva + payload_virt_size
    struct.pack_into('<HBBIIIIIQIIHHHHHHIIIIHHQQQQII', headers, 0x98,
        0x020B, 14, 0, 0x200, 0x400 + payload_raw_size, 0, text_rva, text_rva,
        0x140000000, PAGE_SIZE, FILE_ALIGN, 6, 0, 0, 9, 6, 0,
        0, total_image_size, headers_size, 0, 2, 0x8160,
        0x100000, 0x1000, 0x100000, 0x1000, 0, 16
    )

    # Data directories:
    # 1: Import Table
    struct.pack_into('<II', headers, 0x98 + 112 + 1*8, idt_rva, 40)
    # 12: IAT
    struct.pack_into('<II', headers, 0x98 + 112 + 12*8, iat_rva, 48)

    # Section Headers (3 * 40 bytes = 120 bytes)
    # 0: .text
    headers[0x188:0x188+8] = b'.text\x00\x00\x00'
    struct.pack_into('<IIIIIIHHI', headers, 0x190, 0x200, text_rva, 0x200, 0x400, 0, 0, 0, 0, 0x60000020)

    # 1: .rdata
    headers[0x1B0:0x1B0+8] = b'.rdata\x00\x00'
    struct.pack_into('<IIIIIIHHI', headers, 0x1B8, 0x400, rdata_rva, 0x400, 0x600, 0, 0, 0, 0, 0x40000040)

    # 2: .payload
    headers[0x1D8:0x1D8+8] = b'.pdata\x00\x00'
    struct.pack_into('<IIIIIIHHI', headers, 0x1E0, payload_virt_size, payload_rva, payload_raw_size, 0xA00, 0, 0, 0, 0, 0x40000040)

    pe_bytes = headers + text + rdata + payload_section
    with open(output_path, 'wb') as f:
        f.write(pe_bytes)
    print(f"Generated standalone executable: {output_path} ({len(pe_bytes):,} bytes)")

if __name__ == '__main__':
    with open('dist/index.html', 'rb') as f:
        html = f.read()
    build_standalone_exe(html, 'public/Aetherfall-v0.9.exe')

def build_distribution():
    # 1. Launcher .bat
    bat_content = """@echo off
title Aetherfall 0.9 Launcher - L3X STUD105
echo ====================================================
echo        AETHERFALL 0.9 - A Tale of Broken Skies
echo                 L3X STUD105
echo ====================================================
echo Starting Aetherfall 0.9...

:: Check if index.html exists
if not exist "%~dp0index.html" (
    echo Error: index.html not found!
    pause
    exit /b 1
)

:: Try Microsoft Edge app mode (clean borderless window)
start "" msedge --app="%~dp0index.html" 2>nul
if %errorlevel% equ 0 exit /b 0

:: Try Google Chrome app mode
start "" chrome --app="%~dp0index.html" 2>nul
if %errorlevel% equ 0 exit /b 0

:: Fallback to default browser
start "" "%~dp0index.html"
exit /b 0
"""
    with open('public/Aetherfall-Launcher.bat', 'w', encoding='utf-8') as f:
        f.write(bat_content)

    # 2. README-DESKTOP.txt
    readme_content = """====================================================
  AETHERFALL 0.9 - A Tale of Broken Skies
  L3X STUD105 · 3D Open-World Fantasy Action RPG
====================================================

OFFLINE PLAY INSTRUCTIONS:
----------------------------------------------------
You can play Aetherfall 0.9 completely offline on any Windows PC!

OPTION 1 (Recommended):
Double-click "Aetherfall.exe".
This standalone 64-bit launcher opens the game in a dedicated, borderless app window.

OPTION 2:
Double-click "Aetherfall-Launcher.bat".
This launches the game in Microsoft Edge or Google Chrome app mode.

OPTION 3:
Directly open "index.html" in any modern browser (Chrome, Edge, Firefox, Brave, Safari).
No web server, internet connection, or dependencies required!

SYSTEM REQUIREMENTS:
----------------------------------------------------
- Operating System: Windows 10 / 11 (64-bit) or any modern OS
- Processor: Dual-core 2.0 GHz or higher
- Memory: 4 GB RAM (8 GB recommended for Cinematic preset)
- Graphics: WebGL 2.0 supported GPU (Intel HD 4000 or better)
- Storage: 10 MB free space

KEYBOARD & MOUSE CONTROLS:
----------------------------------------------------
- Move: W, A, S, D
- Look / Camera: Mouse (Click to capture cursor, Esc to release)
- Jump: Spacebar
- Glide: Spacebar again while airborne
- Sprint: Left Shift
- Crouch / Sneak: C
- Primary Attack: Left Mouse Button
- Block / Parry: Right Mouse Button (timed parry reflects damage!)
- Dodge Roll: Q
- Abilities 1 - 5: Keys 1, 2, 3, 4, 5
- Tactical Companion Command: T (Follow / Defend / Attack / Hold)
- Interact / Talk: E
- Mount / Dismount: R
- Quick-Heal: H
- Inventory / Codex: I
- World Map: M
- Journal / Quests: J
- Skill Tree: K
- Emotes: G
- Pause Menu: Escape

CONTROLLER SUPPORT:
----------------------------------------------------
Aetherfall has full plug-and-play controller support (Xbox, PlayStation, standard XInput):
- Left Stick: Movement
- Right Stick: Camera Rotation
- A / Cross: Jump & Glide
- X / RT: Attack
- LT: Block / Perfect Parry
- B / Circle: Dodge Roll
- Y / Triangle: Interact
- RB / R1: Sprint
- LB / L1: Quick-Heal
- D-Pad: Abilities 1-4
- View / Touchpad: Map & Codex
- Menu / Options: Pause

SAVING & PROGRESSION:
----------------------------------------------------
Your game saves automatically every 90 seconds, when sleeping in beds, and when returning
to the title menu.
You can export your save files as JSON at any time from the Load Game menu to transfer
between your desktop and the browser web version seamlessly!

Developed by L3X STUD105. All rights reserved.
"""
    with open('public/README-DESKTOP.txt', 'w', encoding='utf-8') as f:
        f.write(readme_content)

    # 3. Create ZIP package
    zip_path = 'public/Aetherfall-v0.9-Windows.zip'
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        zf.write('public/Aetherfall-v0.9.exe', arcname='Aetherfall.exe')
        zf.write('dist/index.html', arcname='index.html')
        zf.write('public/Aetherfall-Launcher.bat', arcname='Aetherfall-Launcher.bat')
        zf.write('public/README-DESKTOP.txt', arcname='README-DESKTOP.txt')
    print(f"Generated Windows bundle zip: {zip_path} ({os.path.getsize(zip_path):,} bytes)")
    with open('public/.nojekyll', 'w') as f:
        pass
    import shutil
    if os.path.exists('dist'):
        shutil.copy('public/Aetherfall-v0.9.exe', 'dist/Aetherfall-v0.9.exe')
        shutil.copy('public/Aetherfall-v0.9-Windows.zip', 'dist/Aetherfall-v0.9-Windows.zip')
        shutil.copy('public/Aetherfall-Launcher.bat', 'dist/Aetherfall-Launcher.bat')
        shutil.copy('public/README-DESKTOP.txt', 'dist/README-DESKTOP.txt')
        shutil.copy('dist/index.html', 'dist/404.html')
        with open('dist/.nojekyll', 'w') as f:
            pass


build_distribution()
