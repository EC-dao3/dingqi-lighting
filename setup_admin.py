"""
Delete all users + setup admin limit.
Uses Supabase service_role key.
"""
import httpx, sys, io

# Fix encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

SUPABASE_URL = "https://yhfjnvpdaxqoyltsbzhs.supabase.co"
SERVICE_ROLE_KEY = "sb_secret_xLy_wi1orYmNvDC7AW1S8Q_eCXPBHn1"

auth_headers = {
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
}


def delete_all_users():
    """Delete all users via Supabase Auth Admin API."""
    print("Fetching all users...")
    resp = httpx.get(
        f"{SUPABASE_URL}/auth/v1/admin/users",
        headers=auth_headers,
        timeout=30
    )
    if resp.status_code != 200:
        print(f"Error listing users: {resp.status_code} {resp.text[:300]}")
        return

    users = resp.json().get("users", [])
    print(f"Found {len(users)} users")
    
    if len(users) == 0:
        print("No users to delete.")
        return
    
    for i, user in enumerate(users):
        uid = user["id"]
        email = user.get("email", "no email")
        full_name = user.get("user_metadata", {}).get("full_name", "N/A")
        print(f"[{i+1}/{len(users)}] Deleting: {email} ({full_name})")
        
        del_resp = httpx.delete(
            f"{SUPABASE_URL}/auth/v1/admin/users/{uid}",
            headers=auth_headers,
            timeout=30
        )
        if del_resp.status_code == 200:
            print(f"  OK - Deleted")
        else:
            print(f"  FAILED: {del_resp.status_code} {del_resp.text[:100]}")
    
    print(f"\nProcessed {len(users)} users.")


if __name__ == "__main__":
    print("=== DELETE ALL USERS ===")
    delete_all_users()
    
    # Verify
    resp = httpx.get(
        f"{SUPABASE_URL}/auth/v1/admin/users",
        headers=auth_headers,
        timeout=30
    )
    remaining = resp.json().get("users", [])
    print(f"\nUsers remaining: {len(remaining)}")
    print("=== DONE ===")
