import os
import sys
import types

# passlib.pwd (used by flask-security-too) calls `import pkg_resources` to
# load its wordset files. pkg_resources ships with setuptools which is not
# pre-installed on Python 3.12+. Provide a minimal shim using the stdlib
# importlib.resources so the app starts regardless of build-cache state.
if "pkg_resources" not in sys.modules:
    try:
        import pkg_resources  # already available — nothing to do
    except ModuleNotFoundError:
        import importlib.resources as _ir
        _shim = types.ModuleType("pkg_resources")
        def _resource_string(package_or_req, resource_name):
            pkg = (package_or_req if isinstance(package_or_req, str)
                   else package_or_req.__name__)
            return _ir.files(pkg).joinpath(resource_name).read_bytes()
        _shim.resource_string = _resource_string
        sys.modules["pkg_resources"] = _shim

from flask import Flask
from flask_caching import Cache
from flask_cors import CORS
from flask_security import Security, SQLAlchemyUserDatastore
import flask_excel as excel

from backend.models import db, User, Role


def createApp():
    # When frozen by PyInstaller, __file__ points inside a temp dir.
    # Use sys._MEIPASS as the base so Flask can find templates and static files.
    base_dir = getattr(sys, "_MEIPASS", os.path.dirname(os.path.abspath(__file__)))

    # When running inside Electron, use the OS user-data dir for the instance
    # folder so the SQLite database survives app updates and isn't placed in
    # a read-only Program Files directory.
    instance_path = os.environ.get("INSTANCE_PATH") or None

    app = Flask(
        __name__,
        template_folder=os.path.join(base_dir, "frontend", "templates"),
        static_folder=os.path.join(base_dir, "frontend", "static"),
        instance_path=instance_path,
    )

    # Allow all origins in production (Render URL is unknown at build time).
    # Restrict to specific origins in local dev if needed.
    CORS(app, resources={r"/*": {"origins": "*"}})

    # Config: use ProductionConfig on Render, LocalDevelopmentConfig elsewhere.
    if os.environ.get("RENDER"):
        from backend.config import ProductionConfig
        app.config.from_object(ProductionConfig)
    else:
        from backend.config import LocalDevelopmentConfig
        app.config.from_object(LocalDevelopmentConfig)

    # Ensure the instance folder exists so SQLite can create the DB file.
    os.makedirs(app.instance_path, exist_ok=True)

    db.init_app(app)

    cache = Cache(app)
    app.cache = cache

    datastore = SQLAlchemyUserDatastore(db, User, Role)
    app.security = Security(app, datastore=datastore, register_blueprint=False)

    app.app_context().push()

    return app


app = createApp()

import backend.create_initial_data  # noqa: E402  sets up DB + seed data
import backend.routes                # noqa: E402  registers all API routes

excel.init_excel(app)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="127.0.0.1", port=port, debug=False, threaded=True)
