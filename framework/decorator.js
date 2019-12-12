const readonly = (target, property, descriptor) => {
    descriptor.writable = false;
    return descriptor;
};

const Min = (min) => (target, property, descriptor) => {
    if (descriptor.initializer() < min) {
        throw new Error(`Value of ${property} cannot lower than ${min}`);
    }
};

const Max = (max) => (target, property, descriptor) => {
    if (descriptor.initializer() > max) {
        throw new Error(`Value of ${property} cannot higher than ${max}`);
    }
};

const Mixin = mixinList => (target, property, descriptor) => {
    return function (target) {
        Object.assign(target.prototype, ...mixinList);
    };
};

module.exports = {
    readonly,
    Min,
    Max,
    Mixin
};
