import os
from supabase import create_client

_admin_sb = None

def get_admin_sb():
    global _admin_sb
    if _admin_sb is None:
        url = os.environ['SUPABASE_URL']
        key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', os.environ.get('SUPABASE_PUBLISHABLE_KEY'))
        _admin_sb = create_client(url, key)
    return _admin_sb
