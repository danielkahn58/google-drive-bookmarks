var DriveToBookmarkRequests = new function() {
	function AddDriveItemAndChildrenToBookmarkFolder(bookmarkFolder, driveItem) {  //Recursively add drive item and its children to bookmark folder
	  if (typeof driveItem.url === "undefined") { //If the drive path is a folder
		chrome.bookmarks.create({'parentId' : bookmarkFolder.id, 'title' : driveItem.title}, function(NewBookmarkFolder) {
		  driveItem.children.forEach(function(item){
			AddDriveItemAndChildrenToBookmarkFolder(NewBookmarkFolder, item);
		  });
		});
	  }
	  else //If drive path is a file
		chrome.bookmarks.create({'parentId' : bookmarkFolder.id, 'title' : driveItem.title, 'url' : driveItem.url });
	}
	
	function RemoveAllBookmarksFromBookmarkFolder(folder) {
		chrome.bookmarks.getChildren(folder.id, function(children) { //If the folder exists, remove all its children
			children.forEach(function(item) { 
			  chrome.bookmarks.removeTree(item.id);
			});
		});
	}
	
	this.LoadDrivePathsToBookmarks = function(drivePaths) {
	  var rootDrivePath = drivePaths[0];
	  
	  chrome.bookmarks.search({"title" : rootDrivePath.title}, function(bookmarkFolderForDrive) { //Search for a bookmark folder
		// with the title of the root Google drive path
	  
		if (bookmarkFolderForDrive.length === 0) { //If this folder hasn't been created yet, create a new folder and add all the drive files
		  
  			chrome.bookmarks.create({'parentId' : '1', 'title' : rootDrivePath.title}, function(NewBookmarkFolder) {
  		  	  rootDrivePath.children.forEach(function(item){
  				  AddDriveItemAndChildrenToBookmarkFolder(NewBookmarkFolder, item);
  		  		});
  			});
		}
		else //If the folder has been created, remove all its children, then add all the drive files to it
		{ 
			RemoveAllBookmarksFromBookmarkFolder(bookmarkFolderForDrive[0]);
		  	rootDrivePath.children.forEach(function(item){
				AddDriveItemAndChildrenToBookmarkFolder(bookmarkFolderForDrive[0], item);
		  	});
		}
	  });
	  
	}
}



var Display = new function() { //singleton pattern, there's only one display 
	this.authorizationAttempted = false;
		
	this.showAuthPrompt = function (callback) {
		var height = 500; 
		var width = 654; 
		var top = (screen.height - height) / 2; 
		var left = (screen.width - width) / 2; 
		var positionString = 'height=' + height + ',width=' + width + ',top=' + top + ',left=' + left + ',scrollbars=yes'; 
		popup = window.open('https://accounts.google.com/o/oauth2/auth?client_id=643067516973-8ndtu0vlc4pvp1lbh52cvbtim36iarne@developer.gserviceaccount.com&redirect_uri=https://script.google.com/oauthcallback&state=ACjPJvG4cNwvgVErP002oKslLgvbiaesNBRepsdLHWkLEd9ZBFu58IrfTW6UWn0elUHkq12Fu6ahJzs5BgsE1cR1LRb-ydiSgd8&scope=https://www.googleapis.com/auth/script.send_mail+https://www.googleapis.com/auth/userinfo.email+https://www.googleapis.com/auth/drive&response_type=code+gsession&access_type=offline&approval_prompt=force&hl=en&authuser=0', '_blank', positionString); 
	
		CheckIfPopupCloses();
	
		function CheckIfPopupCloses(){ 
			setTimeout(function() { 
				if (popup.closed) {
					this.authorizationAttempted = true;
					callback();
				}
				else 
					CheckIfPopupCloses();
			}, 1000);
		}
	}
	
	this.ShowLoader = function() {
		$("#TryAgainMsg").hide();
		$("#ConfirmationMsg").hide();
		$("#loader").show();
	}
	this.ShowConfirmation = function() {
		$("#ConfirmationMsg").show();
		$("#loader").hide();
	}
	this.ShowTryAgain = function() {
		$("#loader").hide();
		$("#TryAgainMsg").show();
	}
}

function MakeDriveToBookmarksRequest() { 
	Display.ShowLoader();
	
	//Hide prompt messages and show loader while making the request
	var response = $.ajax( { //Make an request to Google Apps Script to get user's Google Drive files
		type : "GET",
		dataType: "JSON",
		url: "https://script.google.com/macros/s/AKfycbzQEJVrQPN2B9EBUN5oXRVyddB3zSQJKmib3k9L3JEMxIk-vpWT/exec",
		crossDomain:true,
		success: function(drivePaths) {
			DriveToBookmarkRequests.LoadDrivePathsToBookmarks(drivePaths);
			
			Display.ShowConfirmation();
		},
		error :function (request, status, error) {
				if (!Display.authorizationAttempted) //If the user has not been authorized yet, prompt them for Google authorization
					Display.showAuthPrompt(MakeDriveToBookmarksRequest);
				else { //Otherwise 
					Display.ShowTryAgain();
					Display.authorizationAttempted = false;
				}
		}
	});
}


$(document).ready(function() {
	$("#ActivateBookmarks").click(MakeDriveToBookmarksRequest);
	
	$("#AuthorizationLink").click(MakeDriveToBookmarksRequest);
});
	
