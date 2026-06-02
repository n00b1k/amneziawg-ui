import bcrypt
import sys
import argparse

def generate_hash(password):
    salt = bcrypt.gensalt(rounds=12)
    password_hash = bcrypt.hashpw(password.encode('utf-8'), salt)
    return password_hash.decode('utf-8')

def main():
    parser = argparse.ArgumentParser(
        description='Generate password hash for AmneziaWG Web UI',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Examples:
  python3 generate_password_hash.py 'mysecretpassword'
  docker run --rm n00b1k/amneziawg-ui:latest gph 'mysecretpassword'
        '''
    )
    
    parser.add_argument(
        'password',
        type=str,
        help='Password to hash'
    )
    
    parser.add_argument(
        '--rounds',
        type=int,
        default=12,
        help='bcrypt rounds (default: 12)'
    )
    
    args = parser.parse_args()
    
    try:
        standard_hash = generate_hash(args.password)
        
        print(f"# You can use this hash in your docker run command:", file=sys.stderr)
        print(f"-e ADMIN_PASSWORD_HASH='{standard_hash}'", file=sys.stderr)
        
    except Exception as e:
        print(f"Error generating hash: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()