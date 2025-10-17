import sys
import os
import winreg

def remove_old_python_refs():
    targets = [
        r"HKCU\Software\Python\PythonCore\3.13",
        r"HKLM\Software\Python\PythonCore\3.13",
    ]
    for path in targets:
        try:
            hive, key = (winreg.HKEY_CURRENT_USER, path[5:]) if path.startswith("HKCU") else (winreg.HKEY_LOCAL_MACHINE, path[5:])
            winreg.DeleteKey(hive, key)
            print(f"[OK] Removed registry key: {path}")
        except FileNotFoundError:
            print(f"[SKIP] Not found: {path}")
        except Exception as e:
            print(f"[ERR] Could not delete {path}: {e}")

def show_env():
    print("\n[INFO] Python executable in use:")
    print(sys.executable)
    print(f"[INFO] Python version: {sys.version}")
    print(f"[INFO] Working dir: {os.getcwd()}\n")

if __name__ == "__main__":
    show_env()
    remove_old_python_refs()

    print("[INFO] Forcing multiprocessing cache rebuild...")
    import multiprocessing.spawn
    multiprocessing.spawn._python_exe = sys.executable  # força caminho atual
    print(f"[OK] multiprocessing now points to: {multiprocessing.spawn._python_exe}")
    print("\n✅ Done! Restart PowerShell and test again.")
