function join_room(){//ルーム参加
    let room_name = $("#join-room-name").val();
    let password = $("#join-password").val();
    if(room_name && password){//両方入力されているか
        $("#connecting").show();
        room = new CounterRoom(room_name,password);
    }else{
        alert("ルーム名、パスワードの両方を入力してください。");
    }
}

function make_room(){//ルーム作成
    $("#home_menu").hide();
    $("#build_window").show();
    $("#user_window_example #add_counter").on("click",() => {//ユーザー例のカウンター追加トリガ
        $("#user_window_example #counters").append(`
            <div class="counter">
                <input type="text" class="short_input" id="counter_name" placeholder="カウンター名"><br>
                <input type="number" class="short_input" id="counter_number" placeholder="初期値">
                <button id="delete">削除</button>
            </div>
        `);
        let counter = $("#user_window_example #counters .counter:last");//追加されたカウンタ
        counter.children("#delete").on("click",() => {//追加されたカウンタの削除トリガ
            counter.remove();
        });
    });
    $("#independent_boxes #add_box").on("click",() => {//独立ボックス追加トリガ
        $("#independent_boxes #boxes").append(`
            <div class="common_box">
                <input type="text" class="long_input" id="box-name" placeholder="ボックス名">
                <img class="icon" src="source/box.svg">
                <div id="counters" class="side">
                    <div class="counter">
                        <input type="text" class="short_input" id="counter_name" placeholder="カウンター名"><br>
                        <input type="number" class="short_input" id="counter_number" placeholder="初期値">
                    </div>
                </div>
                <button id="add_counter">カウンター追加+</button><button id="delete">ボックス削除</button>
            </div>
        `);
        let box = $("#independent_boxes #boxes .common_box:last");//追加されたボックス
        box.children("#delete").on("click",() => {//追加されたボックスの削除トリガ
            box.remove();
        });
        box.children("#add_counter").on("click",() => {//追加されたボックスのカウンタ追加トリガ
            box.children("#counters").append(`
                <div class="counter">
                    <input type="text" class="short_input" id="counter_name" placeholder="カウンター名"><br>
                    <input type="number" class="short_input" id="counter_number" placeholder="初期値">
                    <button id="delete">削除</button>
                </div>
            `);
            let counter = box.find("#counters .counter:last");//追加されたボックスの追加されたカウンタ
            counter.children("#delete").on("click",() => {//追加されたボックスの追加されたカウンタの削除トリガ
                counter.remove();
            });
        });
    });
    $("#makeaccept-trg").on("click",() => {//決定トリガ
        let room_name = $("#make-room-name").val();
        let password = $("#make-password").val();
        if(room_name && password){//両方入力されているか
            let options = {
                room_name: room_name,
                password: password,
                user:{counters:[]},
                boxes:[]
            }
            let unentered = false;
            $("#user_window_example #counters .counter").each(function() {//ユーザー例のカウンタ抽出
                counter = $(this);
                let name = counter.children("#counter_name").val();
                let init_val = counter.children("#counter_number").val();
                if(name && init_val){
                    options.user.counters.push({
                        name:name,
                        init_val:init_val,
                    });
                }else{
                    unentered = true;//入力されていない
                }
            });
            $("#independent_boxes #boxes .common_box").each(function() {//独立ボックスの抽出
                box = $(this);
                let counters = [];
                box.find("#counters .counter").each(function() {//独立ボックス内のカウンタ抽出
                    counter = $(this);
                    let name = counter.children("#counter_name").val();
                    let init_val = counter.children("#counter_number").val();
                    if(name && init_val){
                        counters.push({
                            name:name,
                            init_val:init_val,
                        });
                    }else{
                        unentered = true;//入力されていない
                    }
                });
                let box_name = box.children("#box-name").val();
                if(box_name){
                    options.boxes.push({
                        name:box_name,
                        counters:counters,
                    });
                }else{
                    unentered = true;//入力されていない
                }
            });

            if(!unentered){//すべて入力済み
                console.log(options);
                $("#connecting").show();
                room = new CounterRoom(options.room_name,options.password,options);
            }else{
                alert("すべてのカウンター、ボックスに名前と初期値を入力してください。");
            }
        }else{
            alert("ルーム名、パスワードの両方を入力してください。");
        }
    });
    
}

class CounterRoom{
    constructor(
        room_name,
        password,
        options,//参加するときはundefined
    ){
        this.room_name = room_name;
        this.password = password;
        this.options = options;
        this.counters = {};
        this.names = {};
        this.left_users = [];//ユーザー名
        this.last_log = "";
        this.last_log_times = 0;
        if(options){
            this.room_host = true;
            this.host_name = my_name;
        }else{
            this.room_host = false;
            this.host_name = "";
        }
        this.want_info = false;
        this.destroyed = false;
        this.leave_alert_showed = false;
        this.host_left = false;
        $("#password_display").text(`パスワード：${password}`);
        this.Get_peer();
    }

    Get_peer(){
        this.my_peer = new Peer({
            key: '6c23d306-c84c-4865-9e2d-c3d5add5fac9',
            debug: 2
        });
        this.my_peer.once("open", (id) => {
            this.peer_id = id;
            this.names[this.peer_id] = my_name;
            console.log(id);
            this.Connect_room();
        });
        this.my_peer.on("error", (error) => {
            $("#room_reconnect").hide();
            $("#connecting").hide();
            if(this.my_peer.open){
                alert(`エラー発生。${error.type}: ${error.message} (通信は維持)`);
            }else{
                if(!this.leave_alert_showed){
                    this.leave_alert_showed = true;
                    $("#room_left").show();
                }
                
                alert(`エラー発生。${error.type}: ${error.message}`);
            }
        });
        this.my_peer.on("close",()=>{
            if(this.destroyed){
                console.log("正常に接続が解除されました。");
            }else{
                if(!this.leave_alert_showed){
                    this.leave_alert_showed = true;
                    $("#room_left").show();
                }
            }
        });
    }   

    Connect_room(){
        this.connectionRoom = this.my_peer.joinRoom(`${this.room_name}#${this.password}`, {
            mode: "sfu"
        });
        this.connectionRoom.once("open", () => {
            let members = this.connectionRoom.members;
            let room_cache = Cookies.get(`roomcache_${this.room_name}-${this.password}`);
            let cache_loaded = false;
            if(room_cache){
                room_cache = JSON.parse(room_cache); 
                if(room_cache.host_name == my_name){
                    cache_loaded = true;
                }
            }
            if(members.length  > 0){
                if(this.room_host){
                        alert("すでに作成されているルームです。");
                        this.leave_room();
                        $("#connecting").hide();
                }else{
                    if(cache_loaded){
                        this.return_room(room_cache);
                    }else{
                        this.log(`<SYSTEM> ${my_name}が参加`);
                        $("#room_window #room_display").text(this.room_name);
                        this.events_set();
                        
                        this.want_info = true;
                        this.connectionRoom.send({
                            type:"init",
                            name: my_name,
                        });
                    }
                }
            }else{
                if(this.room_host){
                    if(cache_loaded){
                        if(confirm("キャッシュされている閉鎖済みのルームが見つかりました。削除して作成しますか？")){
                            $("#build_window").hide();
                            $("#room_reconnect").hide();
                            $("#connecting").hide();
                            $("#room_window").show();
                            $("#reload").prop("disabled",true);
                            $("#room_window #room_display").text(this.room_name);
                            this.events_set();
                            this.make_room();
                            this.connecting_finish();
                        }else{
                            alert("キャンセルされました。");
                            this.leave_room();
                            $("#room_reconnect").hide();
                            $("#connecting").hide();
                        }
                    }else{
                        $("#build_window").hide();
                        $("#room_reconnect").hide();
                        $("#connecting").hide();
                        $("#room_window").show();
                        $("#reload").prop("disabled",true);
                        $("#room_window #room_display").text(this.room_name);
                        this.events_set();
                        this.make_room();
                        this.connecting_finish();
                    }
                    $
                }else{
                    if(cache_loaded){
                        alert("キャッシュされている閉鎖済みのルームが見つかったため復元しました。");
                        this.return_room(room_cache);
                    }else{
                        alert("そのルームは作成されていません。");
                        this.leave_room();
                        $("#room_reconnect").hide();
                        $("#connecting").hide();
                    }
                }
            }
            
        });
        
    }

    return_room(room_cache){
        this.room_host = true;
        this.host_name = my_name;

        this.names = room_cache.names;
        let old_peer_id = Object.keys(this.names)[Object.values(this.names).indexOf(my_name)];
        delete this.names[old_peer_id];//前の名前登録を削除
        this.names[this.peer_id] = my_name;

        this.options = room_cache.options;
        this.left_users = Object.values(this.names);
        this.left_users = remove_array_element(this.left_users,my_name);

        this.counters = {};
        this.load_room(room_cache.counters,true);
        if(this.connectionRoom.members.length > 0){
            this.called_members = 0;
            this.connectionRoom.send({
                type:"roll"
            });
        }
        

        this.connecting_finish();
        this.events_set();
        $("#connecting").hide();
        $("#room_reconnect").hide();
        $("#home_menu").hide();
        $("#room_window").show();
        $("#reload").prop("disabled",true);
    }

    leave_room(){
        this.destroyed = true;
        if(this.my_peer.open){
            this.connectionRoom.close();
            this.my_peer.destroy();
        }
        $("#leave").off();
        $("#reload").off();
        $("#all_send").off();
        $("#accept_send").off();
        $("#cancel_send").off();
        delete this;
    }

    events_set(){
        this.connectionRoom.on("peerJoin", (peer_id) => {
            console.log("join",peer_id);
        });
        this.connectionRoom.on("peerLeave", (peer_id) => {
            if(this.rejected_id == peer_id){
                this.rejected_id = "";
            }else{
                if(this.names[peer_id] == this.host_name){
                    this.host_left = true;
                    $("#host_left").show();
                }else{
                    $(`#room_window #users .common_box[data-box-name=${this.names[peer_id]}]`).addClass("left");
                    this.left_users.push(this.names[peer_id]);
                }
            }
        });
        this.connectionRoom.on("data", ({ src, data }) => {
            let peer_id = src;
            console.log(peer_id,data);
            switch(data.type){
                case "init"://ルームに入室したばかりのゲストからの通信
                    if(this.host_left){
                        this.connectionRoom.send({
                            type:"hostleft-reject",
                            peer_id:peer_id,
                        });
                    }else{
                        if(data.name == my_name && !(data.name == this.host_name)){
                            $("#room_reject").show();
                            this.leave_room();
                        }else{
                            if(Object.values(this.names).includes(data.name)){//すでに使われている名前ではないか
                                let old_peer_id = Object.keys(this.names)[Object.values(this.names).indexOf(data.name)];
                                delete this.names[old_peer_id];//前の名前登録を削除
                                this.names[peer_id] = data.name;
                                if(data.name == this.host_name){//ホストと同じ名前か
                                    this.rejected_id = peer_id;
                                    this.connectionRoom.send({
                                        type:"hostname-reject",
                                        peer_id:peer_id,
                                    });
                                }else{
                                    this.left_users = remove_array_element(this.left_users,data.name);//退出済みユーザー削除
                                    $(`#room_window #users .common_box[data-box-name=${data.name}]`).removeClass("left");
                                    this.come_room(data.name,false);
                                }
                            }else{
                                this.log(`<SYSTEM> ${data.name}が参加`);
                                this.names[peer_id] = data.name;
                                this.come_room(data.name);
                            }
                        }
                    }
                    break;
                case "roll"://ルームに入室したホストからの通信
                    if(this.room_host){
                        $("#room_reject").show();
                        this.leave_room();
                    }else{
                        let old_peer_id = Object.keys(this.names)[Object.values(this.names).indexOf(this.host_name)];
                        delete this.names[old_peer_id];//前の名前登録を削除
                        this.names[peer_id] = this.host_name;

                        $("#host_left").hide();
                        console.log("my_name");
                        this.connectionRoom.send({
                            type:"call",
                            name:my_name,
                        });

                        if(!this.host_left){//退出していなければ
                            this.rejected_id = old_peer_id;
                        }
                        this.host_left = false;
                    }
                    
                    break;
                case "call":
                    if(Object.values(this.names).includes(data.name)){
                        let old_peer_id = Object.keys(this.names)[Object.values(this.names).indexOf(data.name)];
                        delete this.names[old_peer_id];
                    }
                    this.names[peer_id] = data.name;

                    this.left_users = remove_array_element(this.left_users,data.name);//退出済みユーザー削除
                    $(`#room_window #users .common_box[data-box-name=${data.name}]`).removeClass("left");

                    this.called_members++;
                    if(this.connectionRoom.members.length <= this.called_members){
                        $("#room_reconnect").hide();
                    }
                    break;
                case "hostname-reject":
                    if(this.want_info && data.peer_id == this.peer_id){
                        alert("ニックネームが対象のルームでホストとして使用されています。");
                        this.leave_room();
                        $("#room_reconnect").hide();
                        $("#connecting").hide();
                    }
                    break;
                case "hostleft-reject":
                    if(this.want_info && data.peer_id == this.peer_id){
                        alert("対象のルームのホストが不在であるため、現在は参加できません。");
                        this.leave_room();
                        $("#room_reconnect").hide();
                        $("#connecting").hide();
                    }
                    break;
                case "reload"://再読込のためのデータ要求
                    if(this.room_host){
                        let filtered_counters = {};
                        for(let box_name in this.counters){
                            filtered_counters[box_name] = {};
                            for(let counter_name in this.counters[box_name]){
                                filtered_counters[box_name][counter_name] = {
                                    num: this.counters[box_name][counter_name].num,
                                };
                            }
                        }
                        console.log(filtered_counters);
                        this.connectionRoom.send({
                            type:"options",
                            options:this.options,
                            names:this.names,
                            counters:filtered_counters,
                            left_users:this.left_users,
                            host_name:my_name,
                        });
                    }
                    break;
                case "options"://再読込のためのデータを受け取る
                    if(this.want_info){
                        this.options = data.options;
                        this.names = data.names;
                        this.counters = {};
                        this.host_name = data.host_name;
                        this.left_users = data.left_users;
                        this.want_info = false;
                        this.load_room(data.counters);
                        $("#loading").hide();
                    }
                    break;
                case "room-info"://入室したルームの情報を受け取る
                    if(this.want_info){
                        this.options = data.options;
                        this.names = data.names;
                        this.counters = {};
                        this.host_name = data.host_name;
                        this.left_users = data.left_users;
                        this.want_info = false;
                        this.load_room(data.counters);
                        this.connecting_finish();
                        $("#home_menu").hide();
                        $("#connecting").hide();
                        $("#room_reconnect").hide();
                        $("#room_window").show();
                    }
                    break;
                case "counter-rewrite":
                    this.rewrite(data.box_name,data.counter_name,data.number,this.names[peer_id]);
                    break;
                case "counter-add":
                    this.add(data.box_name,data.counter_name,data.number,this.names[peer_id]);
                    break;
                case "counter-send":
                    this.send(data.from_box_name,data.from_counter_name,data.to_box_name,data.to_counter_name,data.number,this.names[peer_id]);
                    break;
                case "kick":
                    if(data.name == my_name){
                        $("#kick").show();
                        this.leave_room();
                    }else{
                        this.log(`<${this.names[peer_id]}> ${data.name}をキック`);
                        $(`#room_window #users .common_box[data-box-name=${data.name}]`).remove();
                        let kick_peer_id = Object.keys(this.names)[Object.values(this.names).indexOf(data.name)];
                        delete this.names[kick_peer_id];
                        delete this.counters[data.name];
                        this.left_users = remove_array_element(this.left_users,data.name);
                    }
                    break;
                case "leave":
                    if(data.name == this.host_name){
                        //ホストが退出
                    }else{
                        this.log(`<SYSTEM> ${data.name}が退出`);
                        $(`#room_window #users .common_box[data-box-name=${data.name}]`).remove();
                        let left_peer_id = Object.keys(this.names)[Object.values(this.names).indexOf(data.name)];
                        delete this.names[left_peer_id];
                        delete this.counters[data.name];
                        if(this.room_host){
                            this.cache_room();
                        }
                    }
                    break;
                default:
                    console.warn(`"${peer_id}"から不明なデータを受信しました。`,data);
                    break;
            }
        });


        this.connectionRoom.once("close",()=>{
            if(!this.destroyed){
                if(!this.leave_alert_showed){
                    this.leave_alert_showed = true;
                    $("#room_left").show();
                }
            }
        });
    }

    connecting_finish(){//接続完了
        if(this.room_host){
            this.cache_room();
        }
        $("#reload").on("click",()=>{//再読込
            this.want_info = true;
            $("#loading").show();
            this.connectionRoom.send({
                type:"reload"
            });
        });
        $("#all_send").on("click",()=>{//全送信了承
            let address_elm = $("input[name=address]:checked");
            if(address_elm.length == 1){
                if(address_elm.data("box-name") == this.send_from_box_name && address_elm.data("counter-name") == this.send_from_counter_name){
                    alert("送信元と送信先は異なっている必要があります。");
                }else{
                    console.log(this.counters,this.send_from_box_name,this.send_from_counter_name);
                    let from_counter_num = this.counters[this.send_from_box_name][this.send_from_counter_name].num;
                    this.send(
                        this.send_from_box_name,//送信元のボックス名
                        this.send_from_counter_name,//送信元のカウンタ名
                        address_elm.data("box-name"),//送信先のボックス名
                        address_elm.data("counter-name"),//送信先のカウンタ名
                        from_counter_num,//送信したいカウント数
                        my_name//送信したユーザー
                    );
                    this.connectionRoom.send({
                        type:"counter-send",
                        from_box_name:this.send_from_box_name,
                        from_counter_name:this.send_from_counter_name,
                        to_box_name:address_elm.data("box-name"),
                        to_counter_name:address_elm.data("counter-name"),
                        number:from_counter_num
                    });
                    $(".counter_controller").prop("disabled",false);
                    $("input[name=address]").hide();
                    $("#number_enterplace").val("");
                    $("#number_enterplace").prop("disabled",true);
                    $("#all_send").prop("disabled",true);
                    $("#accept_send").prop("disabled",true);
                    $("#cancel_send").prop("disabled",true);
                }
            }else{
                alert("送信先を選択してください。");
            }
        });
        $("#accept_send").on("click",()=>{//送信了承
            if($("#number_enterplace").val()){
                let address_elm = $("input[name=address]:checked");
                if(address_elm.length == 1){
                    if(address_elm.data("box-name") == this.send_from_box_name && address_elm.data("counter-name") == this.send_from_counter_name){
                        alert("送信元と送信先は異なっている必要があります。");
                    }else{
                        this.send(
                            this.send_from_box_name,//送信元のボックス名
                            this.send_from_counter_name,//送信元のカウンタ名
                            address_elm.data("box-name"),//送信先のボックス名
                            address_elm.data("counter-name"),//送信先のカウンタ名
                            $("#number_enterplace").val(),//送信したいカウント数
                            my_name//送信したユーザー
                        );
                        this.connectionRoom.send({
                            type:"counter-send",
                            from_box_name:this.send_from_box_name,
                            from_counter_name:this.send_from_counter_name,
                            to_box_name:address_elm.data("box-name"),
                            to_counter_name:address_elm.data("counter-name"),
                            number:$("#number_enterplace").val()
                        });
                        $(".counter_controller").prop("disabled",false);
                        $("input[name=address]").hide();
                        $("#number_enterplace").val("");
                        $("#number_enterplace").prop("disabled",true);
                        $("#all_send").prop("disabled",true);
                        $("#accept_send").prop("disabled",true);
                        $("#cancel_send").prop("disabled",true);
                    }
                }else{
                    alert("送信先を選択してください。");
                }
            }else{
                alert("送る量を入力してください。");
            }
        });
        $("#cancel_send").on("click",()=>{//送信キャンセル
            $(".counter_controller").prop("disabled",false);
            $("input[name=address]").hide();
            $("#number_enterplace").val("");
            $("#number_enterplace").prop("disabled",true);
            $("#all_send").prop("disabled",true);
            $("#accept_send").prop("disabled",true);
            $("#cancel_send").prop("disabled",true);
        });
        $("#leave").on("click",()=>{//退出
            if(confirm("退出しますか？")){
                this.connectionRoom.send({
                    type:"leave",
                    name:my_name
                });
                $("#room_window").hide();
                $("#home_menu").show();
                this.leave_room();
            }
        });
    }

    add_box(box_name,counters,can_control,icon,role,left=false){
        this.counters[box_name] = {};

        let box = $(`
            <div class="common_box${left ? " left":""}" data-box-name="${box_name}">
                <text id="user_name">${box_name}</text><img class="icon" src="source/${icon}.svg">
                <div id="counters" class="side"></div>${(role == "user" && this.room_host && box_name != my_name) ? '<button id="kick-trg">×</button>' : ""}
            </div>
        `);//ユーザーボックス生成(left状態のときは、left classを付加)
        if(this.left_users.includes(box_name)){
            box.addClass("left");
        }

        for(let counter of counters){//カウンタ
            let counter_obj;
            if(can_control){
                counter_obj = $(`<div class="counter">
                    <text class="counter_name">${counter.name}</text>
                    <text id="num">${counter.init_val}</text>
                    <input type="number" value="${counter.init_val}" class="rewrite-num" hidden>
                    <input type="radio" name="address" data-counter-name="${counter.name}" data-box-name="${box_name}" hidden><br>
                    <button class="counter_controller" id="rewrite">_</button>
                    <button class="counter_controller" id="rewrite_accept" hidden>✓</button>
                    <div class="adder">
                        <button class="counter_controller" id="add">+</button>
                        <input type="number" value="1" class="add-num counter_controller">
                    </div>
                    <button class="counter_controller" id="send">↑</button>
                </div>`);
                counter_obj.children("#rewrite").on('click', ()=>{//再入力
                    $(".counter_controller").prop("disabled",true);
                    counter_obj.children("#rewrite_accept").prop("disabled",false);
                    counter_obj.children("#rewrite").hide();
                    counter_obj.children("#num").hide();
                    counter_obj.children("#rewrite_accept").show();
                    counter_obj.children(".rewrite-num").show();
                    counter_obj.children(".rewrite-num").val(this.counters[box_name][counter.name].num);
                });
                counter_obj.children("#rewrite_accept").on('click', ()=>{//再入力了承ボタン
                    this.rewrite(box_name,counter.name,counter_obj.children(".rewrite-num").val(),my_name);
                    this.connectionRoom.send({
                        type:"counter-rewrite",
                        box_name:box_name,
                        counter_name:counter.name,
                        number:counter_obj.children(".rewrite-num").val()
                    });
                    $(".counter_controller").prop("disabled",false);
                    counter_obj.children("#rewrite").show();
                    counter_obj.children("#num").show();
                    counter_obj.children("#rewrite_accept").hide();
                    counter_obj.children(".rewrite-num").hide();
                });
                counter_obj.find(".adder #add").on('click', ()=>{//数値の増減
                    this.add(box_name,counter.name,counter_obj.find(".adder .add-num").val(),my_name);
                    this.connectionRoom.send({
                        type:"counter-add",
                        box_name:box_name,
                        counter_name:counter.name,
                        number:counter_obj.find(".adder .add-num").val()
                    });
                });
                counter_obj.children("#send").on('click', ()=>{//カウントの送信
                    $(".counter_controller").prop("disabled",true);
                    $("input[name=address]").show();
                    $("#number_enterplace").prop("disabled",false);
                    $("#all_send").prop("disabled",false);
                    $("#accept_send").prop("disabled",false);
                    $("#cancel_send").prop("disabled",false);
                    this.send_from_box_name = box_name;
                    this.send_from_counter_name = counter.name;
                });
            }else{
                counter_obj = $(`<div class="counter">
                    <text class="counter_name">${counter.name}</text>
                    <text id="num">${counter.init_val}</text>
                    <input type="radio" name="address" data-counter-name="${counter.name}" data-box-name="${box_name}" hidden><br>
                </div>`);
            }
            this.counters[box_name][counter.name] = {
                num: counter.init_val,
                display: counter_obj.children("#num"),
            };
            box.children("#counters").append(counter_obj);
        }
        
        if(role == "user"){
            $("#room_window #users").append(box);
            if(this.room_host){
                box.children("#kick-trg").on("click",()=>{
                    if(confirm(`${box_name}をキックしますか？`)){
                        this.log(`<${my_name}> ${box_name}をキック`);
                        box.remove();
                        this.connectionRoom.send({
                            type:"kick",
                            name:box_name,
                        });
                        let peer_id = Object.keys(this.names)[Object.values(this.names).indexOf(box_name)];
                        delete this.names[peer_id];
                        delete this.counters[box_name];
                        this.left_users = remove_array_element(this.left_users,box_name);
                        this.cache_room();
                    }
                });
            }
            
        }else{
            $("#room_window #boxes").append(box);
        }
        
    }

    cache_room(){
        let filtered_counters = {};
        for(let box_name in this.counters){
            filtered_counters[box_name] = {};
            for(let counter_name in this.counters[box_name]){
                filtered_counters[box_name][counter_name] = {
                    num: this.counters[box_name][counter_name].num,
                };
            }
        }
        Cookies.set(`roomcache_${this.room_name}-${this.password}`,JSON.stringify({
            options:this.options,
            names:this.names,
            counters:filtered_counters,
            host_name:my_name,
        }), { expires: 1 });
    }

    make_room(){
        this.add_box(my_name,this.options.user.counters,true,"crown","user");//自分のボックスを追加
        for(let box of this.options.boxes){
            this.add_box(box.name,box.counters,true,"box","box");//独立ボックスを追加
        }
        console.log(this.counters);
    }

    load_room(filtered_counters,all_left=false){
        $("#room_window #users").empty();
        $("#room_window #boxes").empty();
        this.add_box(my_name,this.options.user.counters,true,this.room_host ? "crown" : "user","user");//自分のボックスを追加
        for(let box of this.options.boxes){
            this.add_box(box.name,box.counters,true,"box","box");//独立ボックスを追加
        }
        for(let user_id in this.names){
            let user_name = this.names[user_id];
            if(user_name != my_name){
                console.log(user_id,user_name);
                this.add_box(user_name,this.options.user.counters,false,user_name == this.host_name ? "crown" : "user","user",all_left);//ゲストのボックスを追加
            }
        }
        for(let box_name in filtered_counters){
            for(let counter_name in filtered_counters[box_name]){
                let num = filtered_counters[box_name][counter_name].num;
                this.counters[box_name][counter_name].num = num;
                this.counters[box_name][counter_name].display.text(num);
            }
        }
    }

    come_room(user_name,add_user=true){
        if(add_user){
            this.add_box(user_name,this.options.user.counters,false,"user","user");//ゲストのボックスを追加
        }
        
        if(this.room_host){
            let filtered_counters = {};
            for(let box_name in this.counters){
                filtered_counters[box_name] = {};
                for(let counter_name in this.counters[box_name]){
                    filtered_counters[box_name][counter_name] = {
                        num: this.counters[box_name][counter_name].num,
                    };
                }
            }
            console.log(filtered_counters);
            this.connectionRoom.send({
                type:"room-info",
                options:this.options,
                names:this.names,
                counters:filtered_counters,
                left_users:this.left_users,
                host_name:my_name,
            });

            this.cache_room();
        }
    }

    log(text){
        if(this.last_log == text){
            $("#log_window div").first().text(this.last_log + ` (×${this.last_log_times+1})`);
            this.last_log_times++;
        }else{
            this.last_log_times = 1;
            this.last_log = text;
            let log_div = $("<div></div>");
            log_div.text(text);
            $("#log_window").prepend(log_div);
        }
        
    }

    rewrite(box_name,counter_name,number,user_name){
        let org_num = this.counters[box_name][counter_name].num;
        this.counters[box_name][counter_name].num = number;
        this.counters[box_name][counter_name].display.text(number);
        this.log(`<${user_name}> ${box_name}の${counter_name}を${org_num}から${number}に書き換え`);
        if(this.room_host){
            this.cache_room();
        }
    }

    add(box_name,counter_name,number,user_name){
        let _num = Number(this.counters[box_name][counter_name].num);
        _num += Number(number);
        _num = String(_num);
        this.counters[box_name][counter_name].num = _num;
        this.counters[box_name][counter_name].display.text(_num);
        this.log(`<${user_name}> ${box_name}の${counter_name}を${0 > Number(number) ? number : "+" + number}`);//足したか引いたかで分岐
        if(this.room_host){
            this.cache_room();
        }
    }

    send(from_box_name,from_counter_name,to_box_name,to_counter_name,number,user_name){
        //取得
        let _from_num  = Number(this.counters[from_box_name][from_counter_name].num);
        let _to_num  = Number(this.counters[to_box_name][to_counter_name].num);
        //変更
        _from_num -= Number(number);
        _to_num += Number(number);
        //型変換
        _from_num = String(_from_num);
        _to_num = String(_to_num);
        //更新
        this.counters[from_box_name][from_counter_name].num = _from_num;
        this.counters[from_box_name][from_counter_name].display.text(_from_num);
        this.counters[to_box_name][to_counter_name].num = _to_num;
        this.counters[to_box_name][to_counter_name].display.text(_to_num);
        this.log(`<${user_name}> ${from_box_name}の${from_counter_name}から${to_box_name}の${to_counter_name}に${number}送信`);
        if(this.room_host){
            this.cache_room();
        }
    }
}

function remove_array_element(array,target){
    return array.filter(value => target != value);
}

// ###グローバルスコープ###

//ルーム参加トリガ
$("#join-trg").on("click",()=>{
    my_name = $("#my_name").val();
    if(my_name){
        Cookies.set("nick_name", my_name, { expires: 1 });
        join_room();
    }else{
        alert("ニックネームを入力してください。");
    }
});
//ルーム作成トリガ
$("#make-trg").on("click",()=>{
    my_name = $("#my_name").val();
    if(my_name){
        Cookies.set("nick_name", my_name, { expires: 1 });
        make_room();
    }else{
        alert("ニックネームを入力してください。");
    }
});
//再接続トリガ
$("#reconnect-trg").on("click",()=>{
    $("#room_left").hide();
    $("#room_reconnect").show();
    room.leave_room();
    room = new CounterRoom(room.room_name,room.password);
});

//ニックネーム読み込み
if(Cookies.get("nick_name")){
    $("#my_name").val(Cookies.get("nick_name"));
}

let room;
let my_name;