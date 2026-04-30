from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import jwt
import bcrypt
import datetime
from functools import wraps

app = Flask(__name__)
CORS(app)

# Configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///taskmanager.db'
app.config['SECRET_KEY'] = 'my_super_secret_key_123'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Database Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50))
    email = db.Column(db.String(50), unique=True)
    password = db.Column(db.LargeBinary) 
    role = db.Column(db.String(20), default='Member')

class Project(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100))
    description = db.Column(db.String(200))

class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100))
    status = db.Column(db.String(20), default='Todo')
    due_date = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    project_id = db.Column(db.Integer, db.ForeignKey('project.id'))
    assigned_to = db.Column(db.Integer, db.ForeignKey('user.id'))

with app.app_context():
    db.create_all()

# Middleware 
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'message': 'Token missing'}), 401
        try:
            token = token.split(" ")[1] 
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = User.query.get(data['user_id'])
        except Exception as e:
            return jsonify({'message': 'Invalid token'}), 401
        return f(current_user, *args, **kwargs)
    return decorated

# Routes
@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    hashed_password = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt())
    new_user = User(name=data['name'], email=data['email'], password=hashed_password, role=data.get('role', 'Member'))
    db.session.add(new_user)
    db.session.commit()
    return jsonify({'message': 'User registered successfully'})

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    user = User.query.filter_by(email=data['email']).first()
    if not user or not bcrypt.checkpw(data['password'].encode('utf-8'), user.password):
        return jsonify({'message': 'Invalid credentials'}), 401
    token = jwt.encode({'user_id': user.id, 'role': user.role, 'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)}, app.config['SECRET_KEY'])
    return jsonify({'token': token, 'user': {'id': user.id, 'name': user.name, 'role': user.role}})

@app.route('/api/dashboard', methods=['GET'])
@token_required
def dashboard(current_user):
    query = Task.query if current_user.role == 'Admin' else Task.query.filter_by(assigned_to=current_user.id)
    return jsonify({
        'total': query.count(),
        'completed': query.filter_by(status='Done').count(),
        'overdue': query.filter(Task.status != 'Done', Task.due_date < datetime.datetime.utcnow()).count()
    })

@app.route('/api/tasks', methods=['GET', 'POST'])
@token_required
def tasks(current_user):
    if request.method == 'GET':
        query = Task.query if current_user.role == 'Admin' else Task.query.filter_by(assigned_to=current_user.id)
        return jsonify([{'id': t.id, 'title': t.title, 'status': t.status} for t in query.all()])
    
    if current_user.role != 'Admin':
         return jsonify({'message': 'Admin access required'}), 403
    data = request.json
    new_task = Task(title=data['title'], project_id=data.get('projectId'), assigned_to=data.get('assignedTo'))
    db.session.add(new_task)
    db.session.commit()
    return jsonify({'message': 'Task created'})

@app.route('/api/tasks/<int:task_id>/status', methods=['PUT'])
@token_required
def update_task_status(current_user, task_id):
    task = Task.query.get(task_id)
    if not task: return jsonify({'message': 'Task not found'}), 404
    task.status = request.json.get('status')
    db.session.commit()
    return jsonify({'message': 'Status updated'})

if __name__ == '__main__':
    app.run(debug=True, port=5000)