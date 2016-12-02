// These tokens are trivial, made of the literal characters we want to recognize, and ensuring it is at
// the start of the string.
var TSTART = /^{{/;
var TEND = /^}}/;
var DSTART = /^{:/;
var DEND = /^:}/;
var PSTART = /^{{{/;
var PEND = /^}}}/;
// Pipe is a bit trickier, since "|" is a special character in RegExp's, so we need to escape it.
var PIPE = /^\|/;

// These rest rely on the same idea.  We match at least 1 character, consisting of a choice between
// something that could not be any of the disallowed tokens, or which is part of a disallowed
// token, but not followed by the rest of it.  For this we make use of the "x(?!y)" operator.

// For PNAME, we can recognize anything but "}", or "}" not followed by another "}", or "}}"
// not followed by another "}".
var PNAME = /^([^}|]|}(?!})|}}(?!}))+/;

// OUTERTEXT recognizes anything but "{", or "{" not followed by either of "{" or ":"
var OUTERTEXT = /^([^{]|{(?!({|:)))+/;

// INNERTEXT recognizes anything but "{" or "|", or "}", or "{" not followed by "{" or ":",
// or "}" not followed by another "}"
var INNERTEXT = /^([^{|}]|{(?!({|:))|}(?!}))+/;

// INNERDTEXT recognizes anything but "{" or "|", or ":", or "{" not followed by "{" or ":",
// or ":" not followed by "}"
var INNERDTEXT = /^([^{|:]|{(?!({|:))|:(?!}))+/;

// Returns the token located at the beginning of s, where the set of allowed tokens
// is given by an object tokenset, as per the assignment format.
// Syntactically correct input is assumed, and the tokenset is assumed appropriate
// for the input too, so we do not need to check for errors of any form.
function scan(s,tokenset) {
    // Inside here we just need to check for each regexp we defined in q1.
    // Tokens are disjoint in all valid cases, except for TSTART and PSTART,
    // which we resolve by always checking for PSTART first.

    // just for debugging
    // var ss = "{ ";
    // for (var t in tokenset) {
    //     ss += t + ": "+tokenset[t]+", ";
    // }
    // addDebugText("Token set: "+ss+"}\n");

    // To go over all tokens we create an array of objects mapping names to the
    // corresponding regexp variables we created in q1.  We use an array
    // so we can check them in a specific order.
    var tokens = [
        { name:"PSTART", regexp:PSTART },
        { name:"PEND", regexp:PEND },
        { name:"TSTART", regexp:TSTART },
        { name:"TEND", regexp:TEND } ,
        { name:"DSTART", regexp:DSTART },
        { name:"DEND", regexp:DEND },
        { name:"PIPE", regexp:PIPE },
        { name:"PNAME", regexp:PNAME },
        { name:"OUTERTEXT", regexp:OUTERTEXT },
        { name:"INNERTEXT", regexp:INNERTEXT },
        { name:"INNERDTEXT", regexp:INNERDTEXT } ];

    // Now, iterative through our tokens array, and see what we find
    for (var i=0; i<tokens.length; i++) {
        var m;
        if (tokenset[tokens[i].name] && (m = s.match(tokens[i].regexp))) {
            return { token:tokens[i].name, value:m[0] };
        }
    }
    throw "Hey, there aren't supposed to be syntactic errors, but I encountered \""+s+"\"";
}

// Parsing the <outer> rule.
function parseOuter(s) {
    // As a base case, if we are fed the empty string just return null.
    if (s=="")
        return null;

    // Find out which of the 3 tokens we know about are at the start of the string.
    var t = scan(s,{OUTERTEXT:true,TSTART:true,DSTART:true});

    // Make up the object we will return; we modify fields below.
    var obj = {name:"outer",
        OUTERTEXT:null,
        templateinvocation:null,
        templatedef:null,
        next:null,
        // We'll keep track of the length of s we consumed in this and all
        // recursive calls here too.
        length:0};

    // And construct the returned object for each of the 3 cases.
    switch (t.token) {
        case 'OUTERTEXT':
            obj.OUTERTEXT = t.value;
            // Skip over consumed token.
            obj.length += t.value.length;
            s = s.substr(obj.length);
            break;
        case 'TSTART':
            obj.templateinvocation = parseTemplateInvocation(s);
            // Update how far we got in through the string.
            obj.length += obj.templateinvocation.length;
            s = s.substr(obj.templateinvocation.length);
            break;
        case 'DSTART':
            obj.templatedef = parseTemplateDef(s);
            // Update how far we got in through the string.
            obj.length += obj.templatedef.length;
            s = s.substr(obj.templatedef.length);
            break;
    }
    // We might have more outer pieces, so keep going.
    obj.next = parseOuter(s);
    // Update length to include everything we consumed.
    if (obj.next!==null)
        obj.length += obj.next.length;
    return obj;
}

// Parsing the <templateinvocation> rule. We assume the inital TSTART is at the front of the string.
function parseTemplateInvocation(s) {
    // Make up the object we will return; we modify fields below.
    var obj = {name:"templateinvocation",
        itext:null,
        targs:null,
        length:0};

    // First we need to skip over the initial token, which must be a TSTART.
    var t = scan(s,{TSTART:true});
    obj.length = t.value.length;
    // And skip over consumed token.
    s = s.substr(obj.length);

    // Next we find the name.  This is an itext, which is a list, and so might be empty.
    obj.itext = parseItext(s);
    if (obj.itext!=null) {
        obj.length += obj.itext.length;
        s = s.substr(obj.itext.length);
        // Strip WS.
        obj.itext = pruneWS(obj.itext,"INNERTEXT");
    }

    // Then parse through the argument list.  Again, this is a list, and it might be empty.
    obj.targs = parseTargs(s);
    if (obj.targs!=null) {
        obj.length += obj.targs.length;
        s = s.substr(obj.targs.length);
    }

    // Finally, we must end with a TEND, so this is guaranteed to exist.
    var t = scan(s,{TEND:true});
    obj.length += t.value.length;
    return obj;
}

// Remove leading and trailing whitespace from our lists.
// Not strictly necessary, as we have to prune it once we evaluate it again anyway,
// but since it was asked for in the assignment here it is.
// The field parameter should be INNERTEXT, or INNERDTEXT as necessary.
function pruneWS(list,field) {
    // Note that we assume our
    function pruneLeading(list,field) {
        if (list!=null && list[field]!==null) {
            list[field] = list[field].replace(/^\s+/,'');
        }
        return list;
    }
    function pruneTrailing(inlist,field) {
        var list = inlist;
        while (list!=null && list.next!=null)
            list = list.next;
        if (list!=null && list[field]!==null) {
            list[field] = list[field].replace(/\s+$/,'');
        }
        return inlist;
    }
    return pruneTrailing(pruneLeading(list,field),field);
}

// Parsing itext.  This returns a linked list of objects, possibly null.
function parseItext(s) {
    // An empty string could be a base case.  Strictly speaking, however, parsing <itext>
    // should never actually terminate in anything other than a PIPE or a TEND, so this
    // is just being over-cautious.
    if (s=="")
        return null;

    // See which token is at the start of the string.
    var t = scan(s,{INNERTEXT:true,TSTART:true,DSTART:true,PSTART:true,PIPE:true,TEND:true});

    // If we scanned PIPE or TEND, then we are done, at a base case.
    if (t.token=="PIPE" || t.token=="TEND")
        return null;

    // Otherwise, we have a legitimate itext rule expansion, as INNERTEXT, an invoc, def, or param.
    var obj = {name:"itext",
        INNERTEXT:null,
        templateinvocation:null,
        templatedef:null,
        tparam:null,
        next:null,
        length:0};

    // And now build the object to be returned.
    switch (t.token) {
        case 'INNERTEXT':
            obj.INNERTEXT = t.value;
            // Skip over consumed token.
            obj.length += t.value.length;
            s = s.substr(obj.length);
            break;
        case 'TSTART':
            obj.templateinvocation = parseTemplateInvocation(s);
            // Update how far we got in through the string.
            obj.length += obj.templateinvocation.length;
            s = s.substr(obj.templateinvocation.length);
            break;
        case 'DSTART':
            obj.templatedef = parseTemplateDef(s);
            // Update how far we got in through the string.
            obj.length += obj.templatedef.length;
            s = s.substr(obj.templatedef.length);
            break;
        case 'PSTART':
            obj.tparam = parseTParam(s);
            // Update how far we got in through the string.
            obj.length += obj.tparam.length;
            s = s.substr(obj.tparam.length);
            break;
    }

    // We might have more pieces to the itext list, so keep going.
    obj.next = parseItext(s);
    // Update length consumed to include the remaining pieces too
    if (obj.next!==null)
        obj.length += obj.next.length;
    return obj;
}

// Parsing targs.  This is another list.
function parseTargs(s) {
    // To start with we should see a PIPE or a TEND.  If we see TEND, then
    // we are done with our list.
    var t = scan(s,{PIPE:true,TEND:true});
    if (t.token=='TEND')
        return null;

    // Ok, we saw a PIPE, so we know we have an argument (and maybe more).

    var obj = {name:"targs",
        itext:null,
        next:null,
        length:t.value.length};

    // Skip over the PIPE.
    s = s.substr(obj.length);

    // Parse the ensuing itext.
    obj.itext = parseItext(s);
    if (obj.itext!=null) {
        obj.length += obj.itext.length;
        s = s.substr(obj.itext.length);
        obj.itext = pruneWS(obj.itext,"INNERTEXT");
    }

    // There might be more arguments, so keep parsing recursively.
    obj.next = parseTargs(s);
    if (obj.next!=null)
        obj.length += obj.next.length;
    return obj;
}

// Parsing <templatedef>.  Very much like parsing an invocation, we get here once we've
// already recognized the DSTART, so we know it starts with one.
function parseTemplateDef(s) {
    var obj = {name:"templatedef",
        // It's all one big list of dtext, but it's a bit easier if we at least split
        // off the name from the rest of it.
        dtext:null,
        dparams:null,
        length:0};

    // First we need to skip over the initial token, which must be a DSTART.
    var t = scan(s,{DSTART:true});
    obj.length = t.value.length;
    // And skip over consumed token.
    s = s.substr(obj.length);

    // Next we find the template name.  This is a dtext.
    obj.dtext = parseDtext(s);
    if (obj.dtext!=null) {
        obj.length += obj.dtext.length;
        s = s.substr(obj.dtext.length);
        // Strip WS.
        obj.dtext = pruneWS(obj.dtext,"INNERDTEXT");
    }

    // Then the parameter list.
    obj.dparams = parseDparams(s);
    // The dparams list cannot be null, as we always have a body.
    obj.length += obj.dparams.length;
    s = s.substr(obj.dparams.length);

    // Clean off any leading/trailing ws from the args, but not the body.
    var d = obj.dparams;
    while(d.next!=null) {
        d.dtext = pruneWS(d.dtext,"INNERDTEXT");
        d = d.next;
    }

    // Finally, we must end with a DEND, so this is guaranteed to exist.
    var t = scan(s,{DEND:true});
    obj.length += t.value.length;
    return obj;
}

// Parsing dtext.  This is quite similar to parseItext, just terminating
// in a DEND instead of TEND, and including INNERDTEXT instead of INNERTEXT.
function parseDtext(s) {
    // Trivial base case check.
    if (s=="")
        return null;

    // See which token is at the start of the string.
    var t = scan(s,{INNERDTEXT:true,TSTART:true,DSTART:true,PSTART:true,PIPE:true,DEND:true});

    // If we scanned PIPE or DEND, then we are done, at a base case.
    if (t.token=="PIPE" || t.token=="DEND")
        return null;

    // Otherwise, we have a legitimate dtext rule expansion, as INNERDTEXT, an invoc, def, or param.
    var obj = {name:"dtext",
        INNERDTEXT:null,
        templateinvocation:null,
        templatedef:null,
        tparam:null,
        next:null,
        length:0};

    // And now build the object to be returned.
    switch (t.token) {
        case 'INNERDTEXT':
            obj.INNERDTEXT = t.value;
            obj.length += t.value.length;
            // Skip over consumed token.
            s = s.substr(obj.length);
            break;
        case 'TSTART':
            obj.templateinvocation = parseTemplateInvocation(s);
            // Update how far we got in through the string.
            obj.length += obj.templateinvocation.length;
            s = s.substr(obj.templateinvocation.length);
            break;
        case 'DSTART':
            obj.templatedef = parseTemplateDef(s);
            // Update how far we got in through the string.
            obj.length += obj.templatedef.length;
            s = s.substr(obj.templatedef.length);
            break;
        case 'PSTART':
            obj.tparam = parseTParam(s);
            // Update how far we got in through the string.
            obj.length += obj.tparam.length;
            s = s.substr(obj.tparam.length);
            break;
    }

    // We might have more pieces to the dtext list, so keep going.
    obj.next = parseDtext(s);
    // Update length consumed to include the remaining pieces too
    if (obj.next!==null)
        obj.length += obj.next.length;
    return obj;
}

// Parsing dparams.  This is another list, of parameters, and the body.
function parseDparams(s) {
    // To start with we should see a PIPE or a DEND.  If we see DEND, then
    // we are done with our list.
    var t = scan(s,{PIPE:true,DEND:true});
    if (t.token=='DEND')
        return null;

    // Ok, we saw a PIPE, so we know we have an parameter (or body).
    var obj = {name:"dparams",
        dtext:null,
        next:null,
        length:t.value.length};

    // Skip over the PIPE.
    s = s.substr(obj.length);

    // Parse the ensuing dtext.
    obj.dtext = parseDtext(s);
    if (obj.dtext!=null) {
        obj.length += obj.dtext.length;
        s = s.substr(obj.dtext.length);
    }

    // There might be more, so keep parsing recursively.
    obj.next = parseDparams(s);
    if (obj.next!=null)
        obj.length += obj.next.length;
    return obj;
}

// Parsing a <tparam> structure.
function parseTParam(s) {
    // We get here having already seen the PSTART, so
    // we just need to skip over that and get the name and the PEND.

    var obj = {name:"tparam",
        pname:null,
        length:0};

    // First we need to skip over the initial token, which must be a PSTART.
    var t = scan(s,{PSTART:true});
    obj.length = t.value.length;
    // And skip over consumed token.
    s = s.substr(obj.length);

    // Now scan the parameter name.
    t = scan(s,{PNAME:true});

    obj.pname = t.value.trim();
    obj.length += t.value.length;
    s = s.substr(t.value.length);

    // And the PEND.
    t = scan(s,{PEND:true});
    obj.length += t.value.length;
    return obj;
}
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


// ******************************************************************************** //


var starter = "{:plasticcost|:} {:metalcost|:}";
var material = "{:newmaterial|cost|{:`material|name| {{#ifeq|{{{name}}}|tostring| [cost: {{{cost}}}] |  {{#ifeq|{{{name}}}|getcost| {{{cost}}} }}  }} :}:}";
var plastic = "{:newplastic|chemical|plasticcost| {:`plastic|name| {{#ifeq|{{{name}}}|tostring| [chemical: {{{chemical}}}, cost: {{ {{newmaterial| {{#ifeq|{{{plasticcost}}}|[object Object]|default|{{{plasticcost}}}}} }}|getcost}} ] |{{#ifeq|{{{name}}}|getchemical|{{{chemical}}}| {{ {{newmaterial| {{#ifeq|{{{plasticcost}}}|[object Object]|default|{{{plasticcost}}}}}  }}|{{{name}}} }} }} }} :}:}";
var metal = "{:newmetal|ferrous|metalcost| {:`metal|name|{{#ifeq|{{{name}}}|tostring| [ferrous: {{{ferrous}}}, cost: {{ {{newmaterial| {{#ifeq|{{{metalcost}}}|[object Object]|default|{{{metalcost}}}}} }}|getcost}} ] |{{#ifeq|{{{name}}}|getferrous|{{{ferrous}}}| {{ {{newmaterial| {{#ifeq|{{{metalcost}}}|[object Object]|default|{{{metalcost}}}}}  }}|{{{name}}} }} }} }} :}:}";

var attachment = "{:newattachment|{:`attachment|name|:}:}";
var holed = "{:newholed|number| {:`holed|name|{{#ifeq|{{{name}}}|tostring| [number: {{{number}}}] | {{#ifeq|{{{name}}}|getnumber|{{{number}}} }} }} :}:}";
var shank = "{:newshank|selfshank| {:`shank|name|{{#ifeq|{{{name}}}|tostring| [selfshank: {{{selfshank}}}] | {{#ifeq|{{{name}}}|getselfshank|{{{selfshank}}} }} }} :}:}";

var str = starter;
str += material + "{{{{newmaterial|10}}|getcost}}";
str += plastic + "{{ {{ newplastic|ABC}}| getcost}}";
str += metal + "{{ {{newmaterial|132}}|tostring}}, {{ {{ newplastic|poly| 232}}|tostring}}, {{ {{ newmetal|no}}|tostring}}";

str += attachment + holed + shank;

str += "\n{{ {{newholed|4}}| tostring}}";
str += "\n{{ {{newshank|integral}}| tostring}}";


// var button = "{:newbutton|mtype|atype|lignenumber|marg|aarg|cost|{:`|name|{:`m|{{ #ifeq|{{{mtype}}}|plastic|{{ newplastic|{{{marg}}}|{{{cost}}} }}|{{ newmetal|{{{marg}}}|{{{cost}}} }}}}:}{:`a|{{ #ifeq|{{{atype}}}|holed|{{ newholed|{{{aarg}}} }}|{{ newshank|{{{aarg}}} }} }}:} {{m| {{{name}}} }} {{a| {{{name}}} }} :} :}";
// var button = "{:newbutton|mtype|atype|lignenumber|marg|aarg|cost|{:`|name|123 {{ {:`|456:} }} :} :}";
var button = "{:newbutton| mtype| atype| lignenumber| marg|aarg| cost| {:`|name| {{ #ifeq|{{{mtype}}}|plastic| {{ {{ newplastic|{{{marg}}}|{{{cost}}} }}| {{{name}}} }}| {{ {{ newmetal|{{{marg}}}|{{{cost}}} }}| {{{name}}} }} }}:}:}";
var button = "{:newbutton| mtype| atype| lignenumber| marg|aarg| cost| {:`|name| {{ #ifeq|{{{mtype}}}|plastic| {{ {{ newplastic|{{{marg}}}|{{{cost}}} }}| {{{name}}} }}| {{ {{ newmetal|{{{marg}}}|{{{cost}}} }}| {{{name}}} }} }} {{ #ifeq|{{{atype}}}|holed|{{ {{ newholed|{{{aarg}}} }}| {{{name}}} }}|{{ {{ newshank|{{{aarg}}} }}| {{{name}}} }}}}  :}:}";


str += button;
str += "\n\n\n";
// str += "{{newbutton|plastic|shank|2.5|poly|integral|456}}";
str += "\n\n\n";
str += "{{ {{newbutton|plastic|shank|2.5|poly|integral|456}}| getselfshank }}";
str += "{{ {{newbutton|plastic|shank|2.5|poly|integral|456}}| getcost }}";
str += "{{ {{newbutton|plastic|shank|2.5|poly|integral|456}}| getnumber }}";

var AST = parseOuter(str);
var globalEnv = createEnv(null);
var outer = evalWML(AST, globalEnv);
console.log("\nEvaluation of WML:\n" + outer);































