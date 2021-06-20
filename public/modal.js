        // Get the modal
        var modal = document.getElementById("myModal");
        
        // // Get the button that opens the modal
        // var btn = document.getElementById("myBtn");
        
        // // Get the <span> element that closes the modal
        // var span = document.getElementsByClassName("close")[0];

        var alertMessage=document.getElementById("alertMessage");
        var alertHead=document.getElementById("alertHead");
        var okButton=document.getElementById("ok");
        var noButton=document.getElementById("no");
        
        // // When the user clicks the button, open the modal 
        // btn.onclick = function() {
        //   modal.style.display = "block";  
        // }

        function displayAlert(message,head){
            modal.style.display = "block";
            alertMessage.innerHTML=message;
            alertHead.innerHTML=head
            // console.log("Alert")
        }

        okButton.onclick=function() {
            modal.style.display = "none";
        }

        noButton.onclick=function() {
            modal.style.display = "none";
        }  
        
        // When the user clicks on <span> (x), close the modal
        // span.onclick = function() {
        //   modal.style.display = "none";
        // }
        
        // When the user clicks anywhere outside of the modal, close it
        // window.onclick = function(event) {
        //   if (event.target == modal) {
        //     modal.style.display = "none";
        //   }
        // }

