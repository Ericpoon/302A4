// Environments
// { parent: env
//   parameter1:stringvalue,
//   parameter2:functionvalue,
//   ... }
// env is an environment
// stringvalue is a string
// functionvalue is an object
// { params: []
//   body: AST
//   env: env }

// Converts an outer, itext or dtext AST node into a string.
function evalWML(a,env) {
    var sout = "";
    // Iterate through the linked list.
    while (a!=null) {

        switch(a.name) {
            case "outer":
            if (a.OUTERTEXT!==null)
                sout += a.OUTERTEXT; // The eval of text is just text.
            else if (a.templateinvocation!=null)
                sout += evalInvocation(a.templateinvocation,env);
            else if (a.templatedef!=null)
                sout += evalDefinition(a.templatedef,env);
            break;

            case "itext":
            if (a.INNERTEXT!==null)
                sout += a.INNERTEXT;
            else if (a.templateinvocation!=null)
                sout += evalInvocation(a.templateinvocation,env);
            else if (a.templatedef!=null)
                sout += evalDefinition(a.templatedef,env);
            else if (a.tparam!=null)
                sout += evalParameter(a.tparam,env);
            break;

            case "dtext":
            if (a.INNERDTEXT!==null)
                sout += a.INNERDTEXT;
            else if (a.templateinvocation!=null)
                sout += evalInvocation(a.templateinvocation,env);
            else if (a.templatedef!=null)
                sout += evalDefinition(a.templatedef,env);
            else if (a.tparam!=null)
                sout += evalParameter(a.tparam,env);
            break;

            default: 
            // We shouldn't need this, but just in case.
            sout += "ERROR("+a.name+")";
            break;
        }
        a = a.next;
    }
    return sout;
}

// Returns the closest binding for name, starting in the given env,
// or null if not found.
function lookup(name,env) {
    //addDebugText('looking up "'+name+'" in env: '+env);
    while (env!==null && !(name in env.bindings)) {
        env = env.parent;
    }
    if (env===null)
        return null;
    return env.bindings[name];
}

// Evaluate a parameter in the given environment.
function evalParameter(param,env) {
    var pname = param.pname.trim();
    var value;
    
    value = lookup(pname,env);
    if (value!==null)
        return value;
    // If we didn't find it, return the original syntax.
    return "{{{"+pname+"}}}";
}

// Evaluate a definition, declared in the given environment.
function evalDefinition(def,env) {
    var name;
    var params = [];
    var body;
    var rc = false;
    // First, find the name of the template definition by recursively
    // evaluating it.
    name =  evalWML(def.dtext,env).trim();
    if (name.length>0 && name.charAt(0)=='`') {
        rc = true;
        name = name.substr(1);
    }
    // Then extract each parameter name, again by recursively evaluation.
    var dparam = def.dparams;
    while (dparam.next!=null) {
        var pname = evalWML(dparam.dtext,env).trim();
        // Check for empty parameter name, which is always an error.
        if (pname==="")
            throw "Empty parameter name in definition of "+name;
        params.push(pname);
        dparam = dparam.next;
    }
    // The last in the dparams list is the body.  We do not evaluate it.
    body = dparam.dtext;
    // Add a template defn object to the env.  Note that we do not check for
    // overwriting, although it would be easy to do so.
    var binding = { params:params,
                    body:body,
                    env:env };
    if (name.length>0)
        env.bindings[name] = binding;
    // If the name started with back-quote then we want to return
    // a string representation of the closure.
    if (rc) {
        return stringify(binding);
    }
    // Otherwise return an empty string.
    return "";
}

// Convert a closure (template binding) into a serialized string.
function stringify(b) {
    // We'll need to keep track of all environments seen.  This
    // variable maps environment names to environments.
    var envs = {};
    // A function to gather all environments referenced.
    // to convert environment references into references to their
    // names.
    function collectEnvs(env) {
        // Record the env, unless we've already done so.
        if (envs[env.name])
            return;
        envs[env.name] = env;
        // Now go through the bindings and look for more env references.
        for (var b in env.bindings) {
            var c = env.bindings[b];
            if (c!==null && typeof(c)==="object") {
                if ("env" in c) {
                    collectEnvs(c.env);
                }
            }
        }
        if (env.parent!==null)
            collectEnvs(env.parent);
    }
    // Ok, first step gather all the environments.
    collectEnvs(b.env);
    // This is the actual structure we will serialize.
    var thunk = { envs:envs ,
                  binding:b
                };
    // And serialize it.  Here we use a feature of JSON.stringify, which lets us
    // examine the current key:value pair being serialized, and override the
    // value.  We do this to convert environment references to environment names,
    // in order to avoid circular references, which JSON.stringify cannot handle.
    var s = JSON.stringify(thunk,function(key,value) {
        if ((key=='env' || key=='parent') && typeof(value)==='object' && value!==null && ("name" in value)) {
            return value.name;
        }
        return value;
    });
    return s;
}

// Convert a serialized closure back into an appropriate structure.
function unstringify(s) {
    var envs;
    // A function to convert environment names back to objects (well, pointers).
    function restoreEnvs(env) {
        // Indicate that we're already restoring this environmnet.
        env.unrestored = false;
        // Fixup parent pointer.
        if (env.parent!==null && typeof(env.parent)==='number') {
            env.parent = envs[env.parent];
            // And if parent is unrestored, recursively restore it.
            if (env.parent.unrestored)
                restoreEnvs(env.parent);
        }
        // Now, go through all the bindings.
        for (var b in env.bindings) {
            var c = env.bindings[b];
            // If we have a template binding, with an unrestored env field
            if (c!==null && typeof(c)==='object' && c.env!==null && typeof(c.env)==='number') {
                // Restore the env pointer.
                c.env = envs[c.env];
                // And if that env is not restored, fix it too.
                if (c.env.unrestored)
                    restoreEnvs(c.env);
            }
        }
    }
    var thunk;
    try {
        thunk = JSON.parse(s);
        // Some validation that it is a thunk, and not random text.
        if (typeof(thunk)!=='object' ||
            !("binding" in thunk) ||
            !("envs" in thunk))
            return null;

        // Pull out our set of environments.
        envs = thunk.envs;
        // Mark them all as unrestored.
        for (var e in envs) {
            envs[e].unrestored = true;
        }
        // Now, recursively, fixup env pointers, starting from
        // the binding env.
        thunk.binding.env = envs[thunk.binding.env];
        restoreEnvs(thunk.binding.env);
        // And return the binding that started it all.
        return thunk.binding;
    } catch(e) {
        // A failure in unparsing it somehow.
        return null;
    }
}

// Evaluate a template invocation, currently in the given environment.
function evalInvocation(template,env) {
    var name;
    var args = [];
    var subenv;

    name =  evalWML(template.itext,env).trim();
    if (name==="") {
        // An empty name is an error.
        throw "Empty name found in definition!";
    }

    // Check for a built-in template.
    var special = isSpecial(name);
    if (special!=null) {
        return special(template,env);
    }

    // Then extract each argument, evaluated of course.
    var arglist = template.targs;
    while (arglist!=null) {
        var arg = evalWML(arglist.itext,env).trim();
        args.push(arg);
        arglist = arglist.next;
    }
    
    // Now we need to find the template itself.
    var defn = lookup(name,env);
    if (defn===null || !("body" in defn)) {
        // We cannot find the template, or the name is not bound to a template definition.
        // Perhaps it is a stringified template
        defn = unstringify(name);
        if (defn===null)
            // For unknown template names, we return the (evaluated) invocation text.
            return '<span style="color:red;">{{'+name+((args.length>0) ? "|" + args.join('|') : "")+'}}</span>';
    }
    // Now, create sub-environment with parameter:argument bindings
    // Here's where we choose static or dynamic binding.  
    // We'll go with static, and link the subenv to the declared env.
    subenv = createEnv(defn.env);
    // Now add in bindings.
    for (var i=0;i<defn.params.length && i<args.length;i++) {
        subenv.bindings[defn.params[i]] = args[i];
    }
    // Finally, we can evaluate the body in our new environment.
    return evalWML(defn.body,subenv);
}

function createEnv(parent) {
    return { parent:parent,
             name: Math.random(),
             bindings: {}
           };
}

// for debugging 
function showEnv(e) {
    var s="ENV "+e.name+", p:"+e.parent+" {\n";
    for (var x in e.bindings) {
        s += " "+x+":"+e[x]+"\n";
    }
    s += "}\n";
    return s;
}

function isSpecial(name) {
    var specials = {
        "#expr":doExpr,
        "#if":doIf,
        "#ifeq":doIfeq
    };

    if (name in specials) {
        return specials[name];
    }
    return null;
}

// Process the #expr built-in.
function doExpr(template,env) {
    // We only accept one argument, so extract and evaluate it.
    var arglist = template.targs;
    // No argument is an empty result.
    if (arglist==null) 
        return "";
    var arg = evalWML(arglist.itext,env).trim();
    
    // Now, treat it as JavaScript code, and use eval to compute
    // the result.  Note that this is not sanitized!
    var result;
    try {
        result = eval(arg);
    } catch(e) {
        result = '<span style="color:red;">#expr error: ' + e + '</span>';
    }
    return result;
}

// Process the #if built-in
function doIf(template,env) {
    // We have 2 or 3 pieces to an if, so pull them out.
    var cond = template.targs;
    var thenpart = (cond!=null) ? cond.next : null;
    var elsepart = (thenpart!=null) ? thenpart.next : null;

    var condeval = (cond==null) ? "" : evalWML(cond.itext,env).trim();
    
    // Now make our decision.
    if (condeval!="") {
        if (thenpart==null)
            return "";
        return evalWML(thenpart.itext,env).trim();
    }
    if (elsepart==null)
        return "";
    return evalWML(elsepart.itext,env).trim();
}

function doIfeq(template,env) {
    // We have 3 or 4 pieces to an ifeq, so pull them out.
    var conda = template.targs;
    var condb = (conda!=null) ? conda.next : null;
    var thenpart = (condb!=null) ? condb.next : null;
    var elsepart = (thenpart!=null) ? thenpart.next : null;

    var condaeval = (conda==null) ? "" : evalWML(conda.itext,env).trim();
    var condbeval = (condb==null) ? "" : evalWML(condb.itext,env).trim();
    
    // Now make our decision.
    if (condaeval==condbeval) {
        if (thenpart==null)
            return "";
        return evalWML(thenpart.itext,env).trim();
    }
    if (elsepart==null)
        return "";
    return evalWML(elsepart.itext,env).trim();
}
