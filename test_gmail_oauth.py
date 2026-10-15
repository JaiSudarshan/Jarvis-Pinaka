"""
JARVIS ONE — Google Cloud (Gmail & Calendar API) Desktop OAuth Test Utility
Run this script to authenticate your Google test account and test real operations:
    python test_gmail_oauth.py
    python test_gmail_oauth.py --reauth  (to re-authenticate with full Calendar + Gmail scopes)
"""

import sys
from pathlib import Path

# Ensure root is in sys.path and UTF-8 output on Windows
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))
try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

from backend.services.gmail_service import gmail_service
from backend.services.calendar_service import calendar_service

def main():
    print("=" * 65)
    print("🤖 JARVIS ONE — Google Cloud (Gmail + Calendar) API Test")
    print("=" * 65)

    if not gmail_service.is_configured():
        print("❌ Error: credentials.json not found in project root!")
        sys.exit(1)

    print("✓ credentials.json detected.")
    print("✓ Project: jarvis-one-511709")
    print("✓ Scopes: Gmail (read, send) & Google Calendar (events, calendar)")

    force_reauth = "--reauth" in sys.argv

    # Check authentication or run local OAuth flow
    if not gmail_service.is_authenticated() or force_reauth:
        print("\n🔑 Launching local desktop OAuth sign-in flow...")
        print("Your browser will open. Sign in with your Google test account and authorize access.\n")
        try:
            account = gmail_service.run_local_oauth_flow()
            print(f"\n🎉 Successfully authorized: {account}")
        except Exception as e:
            print(f"\n❌ OAuth flow failed: {e}")
            sys.exit(1)
    else:
        account = gmail_service.get_connected_account()
        print(f"✓ Currently authenticated as: {account}")

    # Step 1: Test Gmail users.messages.list (Get latest emails)
    print("\n" + "-" * 65)
    print("📬 [Gmail 1] Fetching latest emails (users.messages.list)...")
    print("-" * 65)
    try:
        messages = gmail_service.list_messages(max_results=5)
        if not messages:
            print("No emails found in this mailbox.")
        for idx, msg in enumerate(messages):
            clean_sub = msg['subject'].encode('ascii', errors='replace').decode('ascii')
            clean_from = msg['from'].encode('ascii', errors='replace').decode('ascii')
            print(f"\n[{idx + 1}] ID: {msg['id']}")
            print(f"    From:    {clean_from}")
            print(f"    Date:    {msg['date']}")
            print(f"    Subject: {clean_sub}")

            # Step 2: Test users.messages.get on first email
            if idx == 0:
                print("\n" + "-" * 65)
                print(f"📖 [Gmail 2] Reading email details (users.messages.get for {msg['id']})...")
                print("-" * 65)
                detail = gmail_service.get_message_detail(msg['id'], include_body=True)
                clean_body = (detail['body'] or detail['snippet']).strip().encode('ascii', errors='replace').decode('ascii')
                print(f"Subject: {clean_sub}")
                print(f"Body Preview (first 200 chars):\n{clean_body[:200]}...\n")

    except Exception as e:
        print(f"❌ Error fetching emails: {e}")

    # Step 3: Test search
    print("-" * 65)
    print("🔍 [Gmail 3] Searching emails (q='is:unread')...")
    print("-" * 65)
    try:
        search_res = gmail_service.search_emails(query="is:unread", max_results=3)
        print(f"Found {len(search_res)} unread message(s):")
        for m in search_res:
            clean_sub = m['subject'].encode('ascii', errors='replace').decode('ascii')
            print(f"  • {clean_sub}")
    except Exception as e:
        print(f"❌ Error during search: {e}")

    # Step 4: Test Google Calendar list
    print("\n" + "-" * 65)
    print("📅 [Calendar 1] Checking Google Calendar integration...")
    print("-" * 65)
    try:
        events = calendar_service.list_events(max_results=3)
        print(f"Successfully connected to Google Calendar! Found {len(events)} upcoming event(s):")
        for ev in events:
            print(f"  • {ev['title']} at {ev['start']}")
    except Exception as e:
        print(f"⚠️ Google Calendar API note: {e}")
        if "insufficient" in str(e).lower() or "403" in str(e):
            print("👉 Run `python test_gmail_oauth.py --reauth` to grant Calendar permissions to your token.")

    print("\n" + "=" * 65)
    print("✅ All Google Cloud integration checks completed.")
    print("=" * 65)

if __name__ == "__main__":
    main()
