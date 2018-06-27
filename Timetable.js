var Timetable;
var HeaderText=["Предприятия","",""];
var Indices=[];

Array.prototype.clear=function()
{
    this.splice(0,this.length);
}

function Busyness()
{
    var count=0;
    this.enter=function()
    {
        count++;
        root.disable();
    }
    this.exit=function()
    {
        count--;
        if(count===0)
            root.enable();
    }
};

var Busy=new Busyness;

function GetList(url,process)
{
    var Request=new XMLHttpRequest;
    console.log(url);
    Request.open("GET",url);
    Request.onreadystatechange=function()
    {
        if(Request.readyState==4)
        {
            console.log("Got Answer");
            if(Request.status==200)
            {
                console.log("data recieved ");
                var table,tableEnd,tableEnd2;
                var rest=Request.responseText;
                do
                {
                    table=rest.search("<table");
                    if(table!==-1)
                    {
                        rest=rest.substr(table);
                        table=rest.search(">");
                        rest=rest.substr(table+1);
                        tableEnd=rest.search("</table>");
                        tableEnd2=rest.search("<table");
                        if(tableEnd2!==-1 && (tableEnd===-1 || tableEnd2<tableEnd))
                        {
                            process.run(rest.substring(0,tableEnd2));
                            rest=rest.substr(tableEnd2);
                        }
                        else
                        {
                            process.run(rest.substring(0,tableEnd));
                            rest=rest.substr(tableEnd+8);
                        }
                    }
                }while(table!==-1);
            }
            Busy.exit();
        }
    }
    Request.send();
    Busy.enter();
}

function Href(name,link)
{
    this.name=name;
    this.link=link;
}

function Parser(string)
{
    var str=string;
    this.cutHead=function(from)
    {
        str=str.substr(from);
    };
    this.head=function(to)
    {
        return str.substring(0,to);
    };
    this.search=function(what)
    {
        return str.search(what);
    };
    this.match=function(regexp)
    {
        return str.match(regexp);
    };
    this.substr=function(start,end)
    {
        return str.substring(start,end);
    };
    this.charAt=function(pos)
    {
        return str.charAt(pos);
    };
    this.endTag=function()
    {
        this.cutHead(this.search(">")+1);
    };
    this.tagData=function(tag)
    {
        var end=this.search("</"+tag+">");
        var ret=this.head(end);
        this.cutHead(end+3+tag.length);
        return ret;
    };
    this.parseTag=function(tag,props)
    {
        var ret;
        var nameRE=/^\s*([a-z]+)=\"/,endRE=/[^\\]"/;
        var prop,value,valueEnd;
        var res;
        do
        {
            res=this.match(nameRE);
            if(res!==null)
            {
                prop=res[1];
                this.cutHead(res[0].length);
                value="";
                if(this.charAt(0)=='\"')
                    valueEnd=0;
                else
                    valueEnd=this.search(endRE)+1;
                value=this.head(valueEnd);
                this.cutHead(valueEnd+1);
//                console.log(tag,props);
                props[prop]=value;
            }
        }while(res!==null)
        this.endTag();
        valueEnd=this.search("</"+tag+">");
        ret=this.head(valueEnd);
        this.cutHead(valueEnd+3+tag.length);
        return ret;
    };
    this.getHrefs=function()
    {
        var ret=[];
        var link,name;
        var linkStart,linkEnd,dataStart,dataEnd;
        if(str!==undefined)
        {
            do
            {
                //        console.log(temp);
                linkStart=this.search("<a href=\"");
                if(linkStart!==-1)
                {
                    this.cutHead(linkStart+9);
                    linkEnd=this.search("\"");
                    link=this.head(linkEnd);
                    dataStart=this.search(">");
                    dataEnd=this.search("</a>");
                    name=ClearTags(this.substr(dataStart+1,dataEnd));
                    ret.push(new Href(name,link));
                }
                else
                {
                    linkStart=this.search("<a href='");
                    if(linkStart!==-1)
                    {
                        this.cutHead(linkStart+9);
                        linkEnd=this.search("'");
                        link=this.head(linkEnd);
                        dataStart=this.search(">");
                        dataEnd=this.search("</a>");
                        name=ClearTags(this.substr(dataStart+1,dataEnd));
                        ret.push(new Href(name,link));
                    }
                }
            }while(linkStart!==-1);
        }
        return ret;
    };
}

function ClearTags(str)
{
    if(str===undefined)
        return str;
    var ret=str.replace(/<[^>]+>/g,"").trim();
    while(ret.length>0 && (ret.charAt(ret.length-1)=='\r'||ret.charAt(ret.length-1)=='\n'))
        ret=ret.substring(0,ret.length-1);
    while(ret.length>0 && (ret.charAt(0)=='\r'||ret.charAt(0)=='\n'))
        ret=ret.substr(1);
    return ret;
}

function GetHrefs(str)
{
    var tmp=new Parser(str);
    return tmp.getHrefs();
}

function Table()
{
    this.rows=[];
    this.splitRow=function(i,str)
    {
        var temp=new Parser(str);
        var colStart=0,colEnd;
        var j=0;
        var row=this.rows[i];
        var colspan,rowspan;
        var data;
        do
        {
            if(this.rows[i].cols[j]===undefined)
            {
                colStart=temp.search("<td");
                if(colStart!==-1)
                {
                    temp.cutHead(colStart+3);
                    row.cols[j]={}
                    row.cols[j].data=temp.parseTag("td",row.cols[j]);
                    colspan=(row.cols[j].colspan!==undefined)?row.cols[j].colspan:1;
                    rowspan=(row.cols[j].rowspan!==undefined)?row.cols[j].rowspan:1;
                    for(var l=1;l<colspan;l++)
                        row.cols[j+l]={data:row.cols[j].data};
                    for(var k=1;k<rowspan;k++)
                    {
                        if(this.rows[i+k]===undefined)
                            this.rows[i+k]={cols:[]};
                        for(var l=0;l<colspan;l++)
                            this.rows[i+k].cols[j+l]={data:row.cols[j].data};
                    }
                    j+=(colspan-1);
                }
            }
            j++;
        }while(colStart!==-1)
    };
    this.splitTable=function(str)
    {
        var temp=new Parser(str);
        var rowStart,rowEnd,data;
        var i=0;
        this.rows.clear();
        do
        {
            rowStart=temp.search("<tr");
            if(rowStart!==-1)
            {
                temp.cutHead(rowStart+3);
                if(this.rows[i]===undefined)
                    this.rows[i]={cols:[]};
                data=temp.parseTag("tr",this.rows[i]);
                this.splitRow(i,data);
                i++;
            }
        }while(rowStart!==-1);
    };
    this.empty=function()
    {
        return this.rows.length===0;
    };
    this.lastRow=function()
    {
        return this.rows[this.rows.length-1];
    };
}

function CheckDB(db)
{
    db.transaction(function(tx)
    {
        tx.executeSql("create table if not exists tbl_orgs(id integer,name text,link text)");
        tx.executeSql("create table if not exists tbl_buses(bus_id integer,org_id integer,number text,name text,link text,end_pts text,type text,min text,max text,metro text)");
        tx.executeSql("create table if not exists tbl_stops(org_id integer,bus_id integer,id integer,name text)");
        tx.executeSql("create table if not exists tbl_routes_fwd(org_id integer,bus_id integer,id integer,code text,type text)");
        tx.executeSql("create table if not exists tbl_routes_back(org_id integer,bus_id integer,id integer,code text,type text)");
        tx.executeSql("create table if not exists tbl_routes_fwd_stops(org_id integer,bus_id integer,route_id integer,id integer,stop_id integer,h text,m text)");
        tx.executeSql("create table if not exists tbl_routes_back_stops(org_id integer,bus_id integer,route_id integer,id integer,stop_id integer,h text,m text)");
        tx.executeSql("create table if not exists tbl_directions(org_id integer,bus_id integer,fwd_begin_stop_id integer,fwd_end_stop_id integer,back_begin_stop_id integer,back_end_stop_id integer)");
        //other tables should be created here
    });
}

function ClearDB(db)
{
    db.transaction(function(tx)
    {
        tx.executeSql("drop table tbl_orgs");
        tx.executeSql("drop table tbl_buses");
        tx.executeSql("drop table tbl_stops")
        tx.executeSql("drop table tbl_routes_fwd");
        tx.executeSql("drop table tbl_routes_back");
        tx.executeSql("drop table tbl_routes_fwd_stops");
        tx.executeSql("drop table tbl_routes_back_stops");
        tx.executeSql("drop table tbl_directions");
    });
}

function Route(fwd,Code,Type)
{
    this.bForward=fwd;
    this.code=ClearTags(Code);
    this.type=ClearTags(Type);
    this.stops=[];
    this.time=[];
    this.index=0;
    this.updateModel=function()
    {
        routeModel.clear();
        var len=this.stops.length;
        for(var i=0;i<len;i++)
            routeModel.append({name:this.stops[i].name,
                              h:this.time[i].h,
                              m:this.time[i].m});
    };
}

function Stop(nm,index)
{
    this.name=ClearTags(nm);
    this.index=index;
    this.routes1=[];
    this.routes2=[];
    this.filterTimetable=function(stop)
    {
        timetableModel.clear();
        var work=function(routes)
        {
            var len=routes.length;
            var len2,j;
            for(var i=0;i<len;i++)
            {
                len2=routes[i].route.stops.length;
                for(j=routes[i].stop;j<len2;j++)
                    if(routes[i].route.stops[j]===stop)
                    {
                        timetableModel.append({end:routes[i].route.stops[routes[i].route.stops.length-1].name,
                                                  h:routes[i].h,
                                                  m:routes[i].m,
                                                  attrs:routes[i].route.code,
                                                  type:routes[i].route.type,
                                                  fwd:routes[i].route.bForward,
                                                  ind:routes[i].route.index});
                        break;
                    }
            }
        };
        work(this.routes1);
        work(this.routes2);
    };
}

function Direction(start,end)
{
    this.start=start;
    this.end=end;
}

function Bus(orgs,cols,db,orgind,index)
{
    this.number=ClearTags(cols[0].data);
    var urls=GetHrefs(cols[1].data);
    var stops=[];
    var direction1=new Direction({},{});
    var direction2=new Direction({},{});
    var routes1=[];
    var routes2=[];
    if(urls.length==1)
    {
        this.link=urls[0].link;
        this.name=urls[0].name;
    }
    else
    {
        this.name=cols[1].data;
        this.link="";
    }
    this.endpts=ClearTags(cols[2].data);
    this.type=ClearTags(cols[3].data);
    this.min=ClearTags(cols[4].data);
    this.max=ClearTags(cols[5].data);
    this.metro=ClearTags(cols[6].data);
    this.stops=stops;
    this.direction1=direction1;
    this.direction2=direction2;
    this.routes1=routes1;
    this.routes2=routes2;
    this.getStop=function(str)
    {
        var len=stops.length;
        str=ClearTags(str);
        for(var i=0;i<len;i++)
            if(stops[i].name==str)
                return stops[i];
        return undefined;
    };
    this.empty=function()
    {
        return stops.length===0;
    };
    var updateModel=function()
    {
        var len=stops.length;
        stopModel.clear();
        for(var i=0;i<len;i++)
            stopModel.append({name:stops[i].name,forward:stops[i].routes1.length,back:stops[i].routes2.length});
    };
    this.updateModel=updateModel;
    var save=function()
    {
        db.transaction(function(tx)
        {
            tx.executeSql("delete from tbl_stops where org_id=? and bus_id=?",[orgind,index]);
            var len=stops.length;
            for(var i=0;i<len;i++)
                tx.executeSql("insert into tbl_stops (org_id,bus_id,id,name) values (?,?,?,?)",[orgind,index,i,stops[i].name]);
            tx.executeSql("delete from tbl_directions where org_id=? and bus_id=?",[orgind,index]);
            tx.executeSql("insert into tbl_directions (org_id,bus_id,fwd_begin_stop_id,fwd_end_stop_id,back_begin_stop_id,back_end_stop_id) values (?,?,?,?,?,?)",
                          [orgind,index,direction1.start.index,direction1.end.index,direction2.start.index,direction2.end.index]);
            var ins=function(routes,tblRoute,tblStops)
            {
                tx.executeSql("delete from "+tblRoute+" where org_id=? and bus_id=?",[orgind,index]);
                tx.executeSql("delete from "+tblStops+" where org_id=? and bus_id=?",[orgind,index]);
                var len=routes.length,slen=0;
                var q1="insert into "+tblRoute+" (org_id,bus_id,id,code,type) values (?,?,?,?,?)";
                var q2="insert into "+tblStops+" (org_id,bus_id,route_id,id,stop_id,h,m) values (?,?,?,?,?,?,?)"
                for(var i=0;i<len;i++)
                {
                    tx.executeSql(q1,[orgind,index,i,routes[i].code,routes[i].type]);
                    slen=routes[i].stops.length;
                    for(var j=0;j<slen;j++)
                        tx.executeSql(q2,[orgind,index,i,j,routes[i].stops[j].index,routes[i].time[j].h,routes[i].time[j].m]);
                }
            };
            ins(routes1,"tbl_routes_fwd","tbl_routes_fwd_stops");
            ins(routes2,"tbl_routes_back","tbl_routes_back_stops");
        });
    };
    var load=function()
    {
        var ret=true;
        stops.clear();
        routes1.clear();
        routes2.clear();
        db.readTransaction(function(tx)
        {
            var res=tx.executeSql("select name from tbl_stops where org_id=? and bus_id=? order by id asc",[orgind,index]);
            var len=res.rows.length;
            var item;
            ret=len>0;
            if(!ret)
            {
                console.log("No stops");
                return;
            }
            for(var i=0;i<len;i++)
                stops[i]=new Stop(res.rows.item(i).name,i);
            res=tx.executeSql("select fwd_begin_stop_id,fwd_end_stop_id,back_begin_stop_id,back_end_stop_id from tbl_directions where org_id=? and bus_id=?",[orgind,index]);
            ret=res.rows.length>0;
            if(!ret)
            {
                console.log("No directions");
                stops.clear();
                return;
            }
            item=res.rows.item(0);
            direction1.start=stops[item.fwd_begin_stop_id];
            direction1.end=stops[item.fwd_end_stop_id];
            direction2.start=stops[item.back_begin_stop_id];
            direction2.end=stops[item.back_begin_end_id];
            var sel=function(routes,tblRoute,tblStops,fwd)
            {
                res=tx.executeSql("select code,type from "+tblRoute+" where org_id=? and bus_id=? order by id asc",[orgind,index]);
                var q="select stop_id,h,m from "+tblStops+" where org_id=? and bus_id=? and route_id=? order by id asc";
                len=res.rows.length;
                var sres,slen;
                for(var i=0;i<len;i++)
                {
                    routes[i]=new Route(fwd,res.rows.item(i).code,res.rows.item(i).type);
                    routes[i].index=i;
                    sres=tx.executeSql(q,[orgind,index,i]);
                    slen=sres.rows.length;
                    for(var j=0;j<slen;j++)
                    {
                        routes[i].stops[j]=stops[sres.rows.item(j).stop_id];
                        routes[i].time[j]={h:sres.rows.item(j).h,m:sres.rows.item(j).m};
                        if(fwd)
                            routes[i].stops[j].routes1.push({h:sres.rows.item(j).h,
                                                                m:sres.rows.item(j).m,
                                                                route:routes[i],
                                                                stop:j});
                        else
                            routes[i].stops[j].routes2.push({h:sres.rows.item(j).h,
                                                                m:sres.rows.item(j).m,
                                                                route:routes[i],
                                                                stop:j});
                    }
                }
            };
            sel(routes1,"tbl_routes_fwd","tbl_routes_fwd_stops",true);
            sel(routes2,"tbl_routes_back","tbl_routes_back_stops",false);
        });
        if(ret)
            updateModel();
        return ret;
    };
    this.updateTimetable=function(index)
    {
        if(index<stops.length)
        {
            timetableModel.clear();
            var work=function(routes)
            {
                var len=routes.length;
                for(var i=0;i<len;i++)
                    timetableModel.append({end:routes[i].route.stops[routes[i].route.stops.length-1].name,
                                          h:routes[i].h,
                                          m:routes[i].m,
                                          attrs:routes[i].route.code,
                                          type:routes[i].route.type,
                                          fwd:routes[i].route.bForward,
                                          ind:i});
            };
            work(stops[index].routes1);
            work(stops[index].routes2);
        }
    };
    this.run=function(str)
    {
        var table=new Table;
        table.splitTable(str);
        if(!table.empty() && table.rows.length>3)
        {
            var tlen=table.rows.length;
            var tstops=[];
            for(var i=3;i<tlen;i++)
            {
                if(this.getStop(table.rows[i].cols[0].data)===undefined)
                    stops.push(new Stop(table.rows[i].cols[0].data,stops.length));
                tstops.push(this.getStop(table.rows[i].cols[0].data));
//                console.log(table.rows[i].cols[0].data);
            }
            var start=this.getStop(table.rows[3].cols[0].data);
            var end=this.getStop(table.lastRow().cols[0].data);
            var bForward=false;
            if(direction1.start.name===undefined)
            {
                direction1.start=start;
                direction1.end=end;
                bForward=true;
            }
            else if(direction1.start===start && direction1.end===end)
                bForward=true;
            else if(direction2.start.name===undefined)
            {
                direction2.start=start;
                direction2.end=end;
                bForward=false;
            }
            var clen=table.rows[3].cols.length;
            var route;
            var timeRE=/([0-9]{2}):([0-9]{2})/;
//            console.log(table.rows[0].cols[0].data,table.rows[0].cols[1].data);
 //           console.log(table.rows[1].cols[0].data,table.rows[1].cols[1].data);
   //         console.log(table.rows[2].cols[0].data,table.rows[2].cols[1].data);
            for(var i=1;i<clen;i++)
            {
                route=new Route(bForward,table.rows[1].cols[i].data,
                                table.rows[2].cols[i].data);
                for(var j=3;j<tlen;j++)
                {
                    var m=table.rows[j].cols[i].data.match(timeRE);
                    if(m!==null)
                    {
                        route.stops.push(tstops[j-3]);
                        route.time.push({h:m[1],m:m[2]});
                        if(bForward)
                            tstops[j-3].routes1.push({h:m[1],m:m[2],route:route,stop:route.stops.length-1});
                        else
                            tstops[j-3].routes2.push({h:m[1],m:m[2],route:route,stop:route.stops.length-1});
                    }
                }
                if(bForward)
                {
                    routes1.push(route);
                    route.index=this.routes1.length-1;
                }
                else
                {
                    routes2.push(route);
                    route.index=this.routes2.length-1;
                }
            }

//            console.log("***end***");
        }
        updateModel();
        save();
    };
    this.getstops=function()
    {
        stops.clear();
        direction1.start={};
        direction1.end={};
        direction2.start={};
        direction2.end={};
        routes1.clear();
        routes2.clear();
        if(load())
            return true;
        else if(this.link.length>0)
        {
            GetList(orgs.baseurl+this.link,this);
            return true;
        }
        return false;
    }
}

function Org(orgs,url,db,index)
{
    var buses=[];
    this.link=url.link;
    this.name=url.name;
    this.buses=buses;
    var updateModel=function()
    {
        busModel.clear();
        busModel.append(buses);
    };
    this.updateModel=updateModel;
    var save=function()
    {
        db.transaction(function(tx){
            tx.executeSql("delete from tbl_buses where org_id=?",[index]);
            var len=buses.length;
            for(var i=0;i<len;i++)
                tx.executeSql("insert into tbl_buses (bus_id,org_id,number,name,link,end_pts,type,min,max,metro) values (?,?,?,?,?,?,?,?,?,?)",
                              [i,index,buses[i].number,buses[i].name,buses[i].link,buses[i].endpts,buses[i].type,buses[i].min,buses[i].max,buses[i].metro]);
        });
    };
    var load=function()
    {
        var ret=true;
        db.readTransaction(function(tx)
        {
            buses.clear();
            var res=tx.executeSql("select number,name,link,end_pts,type,min,max,metro from tbl_buses where org_id=? order by bus_id asc",[index]);
            var len=res.rows.length;
            if(len>0)
                for(var i=0;i<len;i++)
                    buses[i]=new Bus(orgs,[{data:res.rows.item(i).number},
                                     {data:"<a href=\""+((res.rows.item(i).link===null)?"":res.rows.item(i).link)+"\">"+res.rows.item(i).name+"</a>"},
                                     {data:res.rows.item(i).end_pts},
                                     {data:res.rows.item(i).type},
                                     {data:res.rows.item(i).min},
                                     {data:res.rows.item(i).max},
                                     {data:res.rows.item(i).metro}],db,index,i);
            ret=len>0;
        });
        if(ret)
            updateModel();
        return ret;
    };
    buses.run=function(tbl)
    {
        console.log("Got bus table");
        var table=new Table;
        table.splitTable(tbl);
        var tlen=table.rows.length;
        var urls;
        for(var i=1;i<tlen-1;i++)
        {
            this.push(new Bus(orgs,table.rows[i].cols,db,index,this.length));
//            console.log(this[this.length-1].number,this[this.length-1].link,this[this.length-1].name);
        }
        updateModel();
        save();
    }
    this.getbuses=function()
    {
        this.buses.clear();
        if(!load())
            GetList(orgs.baseurl+this.link,this.buses);
    }
    this.empty=function()
    {
        return this.buses.length===0;
    }
    this.loadAllBuses=function()
    {
        var len=buses.length;
        for(var i=0;i<len;i++)
            if(buses[i].empty())
                buses[i].getstops();
    };
}

function Orgs(baseurl,db)
{
    var that=this;
    var orgs=[];
    CheckDB(db);
    this.orgs=orgs;
    this.baseurl=baseurl;
    var updateModel=function()
    {
        orgModel.clear();
        orgModel.append(orgs);
    };
    var save=function()
    {
        db.transaction(function(tx)
        {
            tx.executeSql("delete from tbl_orgs");
            var len=orgs.length;
            for(var i=0;i<len;i++)
                tx.executeSql("insert into tbl_orgs (id,name,link) values (?,?,?)",[i,orgs[i].name,orgs[i].link]);
        });
    };
    var load=function()
    {
        var ret=true;
        db.readTransaction(function(tx)
        {
            var res=tx.executeSql("select name,link from tbl_orgs order by id asc");
            var len=res.rows.length;
            if(len>0)
                for(var i=0;i<len;i++)
                    orgs[i]=new Org(that,res.rows.item(i),db,i);
            ret=len>0;
        });
        if(ret)
            updateModel();
        return ret;
    }

    this.run=function(tbl)
    {
        console.log("Refs");
        var refs=GetHrefs(tbl);
        var rlen=refs.length;
        for(var i=0;i<rlen;i++)
            this.orgs[i]=new Org(this,refs[i],db,i,true);
        updateModel();
        save();
    }
    this.empty=function()
    {
        return this.orgs.length==0;
    }
    this.getorgs=function(refresh)
    {
        if(refresh)
            ClearDB(db);
        if(!load())
        {
            orgs.clear();
            GetList(baseurl+"?page=tablef",this);
        }
    }
}

function GetOrgs(baseurl,db)
{
    if(Timetable===undefined)
        Timetable=new Orgs(baseurl,db);
    if(Timetable.empty())
        Timetable.getorgs();
}

function GetBuses(i)
{
    if(i<Timetable.orgs.length)
    {
        if(Timetable.orgs[i].empty())
            Timetable.orgs[i].getbuses();
        else
            Timetable.orgs[i].updateModel();
        Indices[0]=i;
    }
}

function GetStops(i,j)
{
    if(i<Timetable.orgs.length && j<Timetable.orgs[Indices[0]].buses.length)
    {
        if(Timetable.orgs[i].buses[j].empty())
        {
            if(!Timetable.orgs[i].buses[j].getstops())
                return false;
        }
        else
            Timetable.orgs[i].buses[j].updateModel();
        Indices[1]=j;
        return true;
    }
    return false;
}

function CurrentOrg()
{
    return Timetable.orgs[Indices[0]];
}

function CurrentBus()
{
    return Timetable.orgs[Indices[0]].buses[Indices[1]];
}

function CurrentStop()
{
    return Timetable.orgs[Indices[0]].buses[Indices[1]].stops[Indices[2]];
}
