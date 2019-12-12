const commonModule = require('./module');
const { getFuncProps, getConstructorProps } = require('@utils/validate');

class Provider {
    constructor () {
        this.init();
    }

    init () {
        this._cache = commonModule;
    }

    static getInstance () {
        if (!Provider.instance) {
            Provider.instance = new Provider();
        }
        return Provider.instance;
    }

    get cache () {
        return this._cache;
    }

    regist (key, value) {
        this.cache[key] = value;
    }

    loadDep (depName) {
        if (depName && !this.cache[depName]) {
            try {
                const dep = require(`@module/${depName}/${depName}.module.js`);
                this.addDep(depName, dep);
            } catch (error) {
                throw new Error(`依赖模块[${depName}]不存在`);
            }
        }
        return this.cache[depName];
    }

    addDep (depName, Dependency) {
        if (!Dependency || (typeof Dependency !== 'function' && typeof Dependency !== 'object')) throw new Error('依赖模块不存在');
        Dependency = typeof Dependency === 'function' ? new Dependency() : Dependency;
        this.cache[depName] = Dependency;
    }

    injectable () {
        return target => {
            this.addDep(target.name, target);
            const props = getConstructorProps(target.prototype.constructor);
            props.length > 0 && this.getModule([...props]).map(obj => {
                target.prototype[obj.key] = obj.value;
            });
            return target;
        };
    }

    inject (fn, scope = {}) {
        const isClass = fn.toString().startsWith('class');
        const props = (isClass ? getConstructorProps(fn) : getFuncProps(fn)) || [];
        if (props.length === 0) return fn;
        this.getModule([...props]).map((obj, index) => {
            isClass ? fn.prototype[obj.key] = obj.value : props[index] = obj.value;
        });
        return isClass ? fn : fn.apply(scope, props);
    }

    getModule (depName) {
        return [...depName].reduce((acc, depName) => {
            if (depName) {
                if (!this.cache[depName]) {
                    this.loadDep(depName);
                }
                return acc.concat({ key: depName, value: this.cache[depName] });
            }
            return acc;
        }, []);
    }
}
const provider = Provider.getInstance();
global.Provider = provider;

module.exports = {
    inject: (...args) => provider.inject(...args),
    Injectable: provider.injectable.bind(provider),
    regist: (...args) => provider.regist(...args)
};
